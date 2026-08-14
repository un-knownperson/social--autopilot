import {
  ProcessedAiContent,
  AiCallParams,
  processContentWithAi,
  isGeminiConfigured,
  isOpenRouterConfigured,
  isAiConfigured,
  getAiProviderInfo,
} from './aiService.js';

export {
  ProcessedAiContent,
  isGeminiConfigured,
  isOpenRouterConfigured,
  isAiConfigured,
  getAiProviderInfo,
};

export type OpenRouterCallParams = AiCallParams;

/**
 * Universal AI Processing Function
 * Uses Google Gemini API as primary, OpenRouter as secondary, and non-blocking heuristic fallback.
 * Ensures the ingestion and processing workflow never crashes or drops posts.
 */
export async function callOpenRouterAI(params: {
  sourceName?: string;
  categoryHint?: string;
  originalText: string;
  writingStyle?: string;
  brandName?: string;
}): Promise<ProcessedAiContent> {
  return processContentWithAi(params);
}
