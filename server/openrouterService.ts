import { PostCategory } from '../src/types.js';
import { GoogleGenAI } from '@google/genai';

export interface ProcessedAiContent {
  category: PostCategory;
  topic: string;
  summary: string;
  keyFacts: string[];
  importantClaims: string[];
  whyInteresting: string;
  aiRewrite: string;
  headline: string;
  hashtags: string[];
  emojis: string;
}

export interface OpenRouterCallParams {
  sourceName?: string;
  categoryHint?: string;
  originalText: string;
  writingStyle?: string;
  brandName?: string;
}

export function isAiConfigured(): boolean {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
  return hasGemini || hasOpenRouter;
}

export function isOpenRouterConfigured(): boolean {
  return isAiConfigured();
}

function extractJsonFromResponse(raw: string): any {
  let cleaned = raw.trim();

  // Strip markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // If there is surrounding text, slice between first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`Failed to parse AI JSON response: ${err.message}. Raw response was: "${raw.slice(0, 300)}..."`);
  }
}

export async function callOpenRouterAI(params: {
  sourceName?: string;
  categoryHint?: string;
  originalText: string;
  writingStyle?: string;
  brandName?: string;
}): Promise<ProcessedAiContent> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!geminiKey && !openrouterKey) {
    throw new Error('AI API key is not configured. Add GEMINI_API_KEY or OPENROUTER_API_KEY to your server environment.');
  }

  const writingStyle = params.writingStyle || 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)';
  const brandName = params.brandName || 'Social AutoPilot Hub';

  const systemPrompt = `You are the AI content engine for "${brandName}".
Your goal is to analyze raw content sources, detect the core topic/category, extract key facts, and create a fresh, high-quality, rewritten social media post.

CRITICAL WRITING & FACT CHECKING REQUIREMENTS:
- Target Writing Style: "${writingStyle}".
- If writing style specifies Roman Urdu or Natural Roman Urdu: Write in natural, conversational, fluent Roman Urdu (e.g. "Aaj ki bari tech update!", "Zabardast fact!", "Suno dosto!").
- Short and engaging, social-media friendly, easy to understand.
- Preserve factual information where appropriate, but create original wording. Do NOT blindly copy the source wording or sentence structure.
- CRITICAL CLAIM VERIFICATION RULE: Extract key facts and important claims. If the source appears to contain an unverifiable, uncertain, or speculative claim, clearly mark that claim with "Needs verification" (e.g., "[Claim text] - Needs verification").
- Do NOT present uncertain or unverified claims as confirmed facts in the rewritten post text.
- Tone adaptation based on content:
  - If content is Funny: Keep it witty, humorous, and entertaining.
  - If content is Fact: Make it crisp, fascinating, and mind-blowing.
  - If content is News: Keep it clear, timely, and punchy.
  - If content is Opinion: Make it thought-provoking and engaging.
  - If content is General: Make it informative and easy to read.
- Avoid robotic AI language ("In today's fast-paced digital era", "Furthermore", "In conclusion", "Delve into").
- Use emojis naturally, not excessively (2-4 emojis).

REQUIRED OUTPUT FORMAT:
You MUST respond ONLY with a single, valid, raw JSON object (without markdown code blocks) strictly adhering to this structure:
{
  "category": "Funny" | "Fact" | "News" | "Opinion" | "General",
  "topic": "Main topic of the post",
  "summary": "Short 1-2 sentence summary",
  "keyFacts": ["2-4 key facts or main ideas"],
  "importantClaims": ["2-4 important claims. If claim is unverifiable or uncertain, append '- Needs verification'"],
  "whyInteresting": "Short explanation of why this post is interesting",
  "aiRewrite": "Fresh rewritten post in target writing style preserving original facts",
  "headline": "Catchy suggested headline",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "emojis": "2-4 suggested emojis"
}`;

  const userPrompt = `Source Name: ${params.sourceName || 'Unknown'}
Source Category Hint: ${params.categoryHint || 'General'}
Original Content:
${params.originalText}`;

  let rawContent = '';

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      });
      rawContent = response.text?.trim() || '';
    } catch (geminiErr: any) {
      console.warn('Gemini API call failed, attempting fallback if available:', geminiErr?.message);
      if (!openrouterKey) {
        throw new Error(`Gemini API Error: ${geminiErr.message}`);
      }
    }
  }

  if (!rawContent && openrouterKey) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai.studio/build',
        'X-Title': 'Social AutoPilot',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const errMsg =
        errBody?.error?.message ||
        errBody?.message ||
        `OpenRouter API HTTP ${response.status}: ${response.statusText}`;
      throw new Error(`OpenRouter error: ${errMsg}`);
    }

    const data = await response.json();
    rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
  }

  if (!rawContent) {
    throw new Error('Received empty completion content from AI engine.');
  }

  const parsed = extractJsonFromResponse(rawContent);

  const validCategories: PostCategory[] = ['Funny', 'Fact', 'News', 'Opinion', 'General'];
  const detectedCategory: PostCategory = validCategories.includes(parsed.category)
    ? parsed.category
    : (params.categoryHint as PostCategory) || 'General';

  return {
    category: detectedCategory,
    topic: typeof parsed.topic === 'string' ? parsed.topic : 'General Topic',
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    keyFacts: Array.isArray(parsed.keyFacts) ? parsed.keyFacts : [parsed.keyFacts].filter(Boolean),
    importantClaims: Array.isArray(parsed.importantClaims) ? parsed.importantClaims : [parsed.importantClaims].filter(Boolean),
    whyInteresting: typeof parsed.whyInteresting === 'string' ? parsed.whyInteresting : '',
    aiRewrite: typeof parsed.aiRewrite === 'string' ? parsed.aiRewrite : rawContent,
    headline: typeof parsed.headline === 'string' ? parsed.headline : 'Post Update',
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [parsed.hashtags].filter(Boolean),
    emojis: typeof parsed.emojis === 'string' ? parsed.emojis : '✨📱',
  };
}
