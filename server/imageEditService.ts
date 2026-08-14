import { GoogleGenAI } from '@google/genai';

export interface EditImageParams {
  imageUrl: string;
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
}

export interface EditImageResult {
  success: boolean;
  editedImageUrl?: string;
  originalImageUrl: string;
  prompt: string;
  error?: string;
  details?: string;
  provider?: string;
  model?: string;
}

export function isGeminiImageEditingConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

/**
 * Fetches an image from a URL or parses a data URI, returning base64 and standard MIME type.
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  const trimmed = imageUrl.trim();

  // If already a data URI (data:image/png;base64,...)
  if (trimmed.startsWith('data:')) {
    const matches = trimmed.match(/^data:([^;]+);base64,(.+)$/);
    if (matches && matches[1] && matches[2]) {
      return {
        mimeType: matches[1].toLowerCase(),
        data: matches[2],
      };
    }
    throw new Error('Invalid or malformed data URI for image');
  }

  // If HTTP / HTTPS URL, fetch with realistic headers
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(trimmed, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch source image from URL (HTTP ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');

    let mimeType = (response.headers.get('content-type') || '').toLowerCase().split(';')[0].trim();
    if (!mimeType || !mimeType.startsWith('image/')) {
      // Deduce from URL extension
      if (/\.jpe?g(\?.*)?$/i.test(trimmed)) mimeType = 'image/jpeg';
      else if (/\.png(\?.*)?$/i.test(trimmed)) mimeType = 'image/png';
      else if (/\.webp(\?.*)?$/i.test(trimmed)) mimeType = 'image/webp';
      else if (/\.gif(\?.*)?$/i.test(trimmed)) mimeType = 'image/gif';
      else mimeType = 'image/jpeg';
    }

    return {
      mimeType,
      data: base64Data,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Source image download timed out after 12 seconds');
    }
    throw err;
  }
}

/**
 * Performs AI image editing using Google GenAI SDK with the configured GEMINI_API_KEY.
 * Always retains the original image and never crashes if the service or key is unavailable.
 */
export async function editImageWithAI(params: EditImageParams): Promise<EditImageResult> {
  const { imageUrl, prompt, aspectRatio = '1:1' } = params;

  if (!imageUrl || !imageUrl.trim()) {
    return {
      success: false,
      originalImageUrl: imageUrl || '',
      prompt,
      error: 'No image URL provided for AI editing.',
    };
  }

  if (!prompt || !prompt.trim()) {
    return {
      success: false,
      originalImageUrl: imageUrl,
      prompt,
      error: 'Please provide an editing instruction or prompt.',
    };
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) {
    return {
      success: false,
      originalImageUrl: imageUrl,
      prompt,
      error: 'GEMINI_API_KEY is not configured in server environment. Please set GEMINI_API_KEY in the deployment Settings menu.',
      details: 'Provider requires Google AI Studio / Gemini API key.',
    };
  }

  try {
    // 1. Download and encode source image
    const { data: base64Data, mimeType } = await fetchImageAsBase64(imageUrl);

    // 2. Initialize Google GenAI
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    // Model selection: gemini-3.1-flash-image or gemini-3.1-flash-lite-image
    const modelName = 'gemini-3.1-flash-image';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Edit this image according to the following instructions: ${prompt.trim()}. Return the high quality edited image.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    // 3. Extract the image from candidates
    const parts = response.candidates?.[0]?.content?.parts || [];
    let editedImageBase64: string | null = null;
    let editedMimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        editedImageBase64 = part.inlineData.data;
        if (part.inlineData.mimeType) {
          editedMimeType = part.inlineData.mimeType;
        }
        break;
      }
    }

    if (!editedImageBase64) {
      // Check if text feedback was returned instead
      const textFeedback = parts.map((p) => p.text).filter(Boolean).join(' ');
      return {
        success: false,
        originalImageUrl: imageUrl,
        prompt,
        error: textFeedback || 'AI model did not return an edited image.',
        details: 'The model may have generated a text response instead of image data. Try refining your editing prompt.',
        provider: 'Google GenAI',
        model: modelName,
      };
    }

    const fullDataUrl = `data:${editedMimeType};base64,${editedImageBase64}`;

    return {
      success: true,
      editedImageUrl: fullDataUrl,
      originalImageUrl: imageUrl,
      prompt,
      provider: 'Google GenAI',
      model: modelName,
    };
  } catch (err: any) {
    console.error('[ImageEditService] AI Image editing error:', err);
    return {
      success: false,
      originalImageUrl: imageUrl,
      prompt,
      error: err.message || 'AI image editing request failed.',
      details: err.status ? `HTTP Status ${err.status}` : 'Check GEMINI_API_KEY quota or image accessibility.',
      provider: 'Google GenAI',
    };
  }
}
