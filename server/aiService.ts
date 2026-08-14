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
  provider: 'gemini' | 'openrouter' | 'fallback';
  model?: string;
  warning?: string;
}

export interface AiCallParams {
  sourceName?: string;
  categoryHint?: string;
  originalText: string;
  writingStyle?: string;
  brandName?: string;
}

export interface AiProviderInfo {
  available: boolean;
  activeProvider: 'gemini' | 'openrouter' | 'fallback' | 'none';
  geminiConfigured: boolean;
  openrouterConfigured: boolean;
  openrouterRateLimited: boolean;
  openrouterRateLimitedUntil?: string;
  note: string;
}

// In-memory rate-limit tracking to prevent spamming blocked providers
let openrouterRateLimitedUntil = 0;
let geminiRateLimitedUntil = 0;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
}

export function isAiConfigured(): boolean {
  return isGeminiConfigured() || isOpenRouterConfigured();
}

export function getAiProviderInfo(): AiProviderInfo {
  const gemini = isGeminiConfigured();
  const openrouter = isOpenRouterConfigured();
  const now = Date.now();
  const orRateLimited = openrouterRateLimitedUntil > now;

  let activeProvider: 'gemini' | 'openrouter' | 'fallback' | 'none' = 'none';
  if (gemini && geminiRateLimitedUntil <= now) {
    activeProvider = 'gemini';
  } else if (openrouter && !orRateLimited) {
    activeProvider = 'openrouter';
  } else if (gemini || openrouter) {
    activeProvider = 'fallback';
  }

  let note = 'No AI API keys configured. Running in non-blocking offline/fallback mode.';
  if (gemini) {
    note = 'Google Gemini API is configured and primary.';
  } else if (openrouter) {
    note = orRateLimited
      ? 'OpenRouter free tier quota exceeded. Auto-cooling active, non-blocking fallback in use.'
      : 'OpenRouter API is configured as active provider.';
  }

  return {
    available: gemini || (openrouter && !orRateLimited),
    activeProvider,
    geminiConfigured: gemini,
    openrouterConfigured: openrouter,
    openrouterRateLimited: orRateLimited,
    openrouterRateLimitedUntil: orRateLimited ? new Date(openrouterRateLimitedUntil).toISOString() : undefined,
    note,
  };
}

function extractJsonFromResponse(raw: string): any {
  let cleaned = raw.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  // Find first '{' and last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    throw new Error(`Failed to parse AI JSON response: ${err.message}. Raw preview: "${raw.slice(0, 200)}..."`);
  }
}

/**
 * Intelligent Heuristic Fallback Provider:
 * Generates sensible, structured post metadata when no AI key is provided
 * or when AI providers are rate-limited / quota exhausted.
 * This guarantees the user's ingestion workflow NEVER breaks.
 */
export function generateHeuristicFallback(params: AiCallParams, warningMessage?: string): ProcessedAiContent {
  const text = (params.originalText || '').trim();
  const validCategories: PostCategory[] = ['Funny', 'Fact', 'News', 'Opinion', 'General'];

  // Keyword-based category detection
  let detectedCategory: PostCategory = (params.categoryHint as PostCategory) || 'General';
  if (!validCategories.includes(detectedCategory) || detectedCategory === 'General') {
    const lower = text.toLowerCase();
    if (lower.includes('haha') || lower.includes('funny') || lower.includes('joke') || lower.includes('meme') || lower.includes('lol')) {
      detectedCategory = 'Funny';
    } else if (lower.includes('did you know') || lower.includes('fact:') || lower.includes('study shows') || lower.includes('research')) {
      detectedCategory = 'Fact';
    } else if (lower.includes('breaking') || lower.includes('announces') || lower.includes('update') || lower.includes('news') || lower.includes('launch')) {
      detectedCategory = 'News';
    } else if (lower.includes('i think') || lower.includes('my view') || lower.includes('opinion') || lower.includes('should') || lower.includes('believe')) {
      detectedCategory = 'Opinion';
    }
  }

  // Extract first sentence or title as headline
  const firstLine = text.split('\n')[0] || '';
  const firstSentence = firstLine.split(/[.!?]/)[0] || '';
  const headline = (firstSentence.length > 5 && firstSentence.length < 90)
    ? firstSentence.trim()
    : (params.sourceName ? `${params.sourceName} Update` : 'Content Update');

  // Generate 2-3 key points from paragraphs or sentences
  const sentences = text
    .split(/[\n.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);
  const keyFacts = sentences.slice(0, 3);
  if (keyFacts.length === 0 && text) {
    keyFacts.push(text.slice(0, 120));
  }

  // Short 1-2 sentence summary
  const summary = sentences.slice(0, 2).join('. ') || text.slice(0, 160);

  return {
    category: detectedCategory,
    topic: params.sourceName ? `${params.sourceName} Post` : 'Social Media Content',
    summary: summary || 'Original shared content received and queued.',
    keyFacts: keyFacts.length > 0 ? keyFacts : ['Source content ready for review'],
    importantClaims: keyFacts.map((f) => `${f} - Needs verification`),
    whyInteresting: 'Shared content ready for audience publishing.',
    aiRewrite: text, // Preserves original post content cleanly
    headline: headline || 'Post Update',
    hashtags: ['#update', `#${detectedCategory.toLowerCase()}`, '#socialautopilot'],
    emojis: '✨📱',
    provider: 'fallback',
    warning: warningMessage || 'AI provider unavailable or quota reached. Ingested with original text and media intact.',
  };
}

/**
 * Executes AI generation with Gemini as primary provider, OpenRouter as secondary,
 * and Heuristic Fallback as non-blocking guarantee.
 */
export async function processContentWithAi(params: AiCallParams): Promise<ProcessedAiContent> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const now = Date.now();

  const writingStyle = params.writingStyle || 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)';
  const brandName = params.brandName || 'Social AutoPilot Hub';

  const systemPrompt = `You are the AI content engine for "${brandName}".
Your goal is to analyze raw content sources, detect the core topic/category, extract key facts, and create a fresh, high-quality, rewritten social media post.

CRITICAL WRITING & FACT CHECKING REQUIREMENTS:
- Target Writing Style: "${writingStyle}".
- If writing style specifies Roman Urdu: Write in natural, conversational, fluent Roman Urdu (e.g. "Aaj ki bari update!", "Zabardast fact!").
- Short and engaging, social-media friendly, easy to understand.
- Preserve factual information where appropriate, but create original wording. Do NOT blindly copy the source wording.
- CRITICAL CLAIM VERIFICATION RULE: Extract key facts and important claims. If the source contains an unverifiable or uncertain claim, append "- Needs verification".
- Tone adaptation: Funny (witty), Fact (crisp/fascinating), News (timely/punchy), Opinion (thought-provoking), General (informative).
- Avoid robotic AI language ("In today's fast-paced digital era", "Furthermore", "In conclusion").
- Use emojis naturally (2-4 emojis).

REQUIRED OUTPUT FORMAT:
Respond ONLY with a single, valid, raw JSON object:
{
  "category": "Funny" | "Fact" | "News" | "Opinion" | "General",
  "topic": "Main topic of the post",
  "summary": "Short 1-2 sentence summary",
  "keyFacts": ["2-4 key facts or main ideas"],
  "importantClaims": ["2-4 important claims. If uncertain, append '- Needs verification'"],
  "whyInteresting": "Short explanation of why this post is interesting",
  "aiRewrite": "Fresh rewritten post in target writing style",
  "headline": "Catchy suggested headline",
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "emojis": "2-4 suggested emojis"
}`;

  const userPrompt = `Source Name: ${params.sourceName || 'Unknown'}
Source Category Hint: ${params.categoryHint || 'General'}
Original Content:
${params.originalText}`;

  // 1. PRIMARY PROVIDER: Google Gemini API
  if (geminiKey && geminiRateLimitedUntil <= now) {
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

      const rawContent = response.text?.trim() || '';
      if (rawContent) {
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
          aiRewrite: typeof parsed.aiRewrite === 'string' ? parsed.aiRewrite : params.originalText,
          headline: typeof parsed.headline === 'string' ? parsed.headline : 'Post Update',
          hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [parsed.hashtags].filter(Boolean),
          emojis: typeof parsed.emojis === 'string' ? parsed.emojis : '✨📱',
          provider: 'gemini',
          model: 'gemini-3.7-flash',
        };
      }
    } catch (geminiErr: any) {
      const errMsg = geminiErr?.message || '';
      console.warn('[AiService] Gemini API call failed:', errMsg);
      if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
        geminiRateLimitedUntil = Date.now() + 5 * 60 * 1000; // 5 min backoff
      }
    }
  }

  // 2. SECONDARY PROVIDER: OpenRouter API
  if (openrouterKey && openrouterRateLimitedUntil <= now) {
    try {
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
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.status === 429) {
        const errBody = await response.json().catch(() => ({}));
        const errMsg = errBody?.error?.message || 'Rate limit exceeded: free-models-per-day';
        console.warn('[AiService] OpenRouter rate limited (429):', errMsg);
        // Cool down OpenRouter for 15 minutes to avoid spamming
        openrouterRateLimitedUntil = Date.now() + 15 * 60 * 1000;
      } else if (response.ok) {
        const data = await response.json();
        const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
        if (rawContent) {
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
            aiRewrite: typeof parsed.aiRewrite === 'string' ? parsed.aiRewrite : params.originalText,
            headline: typeof parsed.headline === 'string' ? parsed.headline : 'Post Update',
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [parsed.hashtags].filter(Boolean),
            emojis: typeof parsed.emojis === 'string' ? parsed.emojis : '✨📱',
            provider: 'openrouter',
            model: 'openrouter/free',
          };
        }
      }
    } catch (openRouterErr: any) {
      console.warn('[AiService] OpenRouter API call failed:', openRouterErr?.message);
    }
  }

  // 3. NON-BLOCKING FALLBACK:
  // If neither provider worked, return heuristic analysis with non-blocking warning.
  const warningMsg = !geminiKey && !openrouterKey
    ? 'No AI key configured. Using original post content in queue.'
    : 'AI provider quota reached. Using original post content in queue (non-blocking).';

  return generateHeuristicFallback(params, warningMsg);
}
