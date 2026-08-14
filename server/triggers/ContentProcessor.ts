import { SourcePost, Post, PostCategory, TriggerType, TriggerActivityLog } from '../../src/types.js';
import { TriggerPayload, TriggerResult } from './types.js';
import { callOpenRouterAI, isOpenRouterConfigured } from '../openrouterService.js';
import { extractUrlMetadataAndImage } from '../urlExtractor.js';

export interface StoreContext {
  getPosts(): Post[];
  addPost(post: Post): void;
  updatePost(id: string, post: Partial<Post>): void;
  getSourcePosts(): SourcePost[];
  addSourcePost(sourcePost: SourcePost): void;
  updateSourcePost(id: string, sourcePost: Partial<SourcePost>): void;
  getTriggerLogs(): TriggerActivityLog[];
  addTriggerLog(log: TriggerActivityLog): void;
  getDefaultCategory(): PostCategory;
  getWritingStyle(): string;
  getBrandName(): string;
  logActivity(type: any, description: string, postId?: string): void;
  save(): void;
}

export class ContentProcessor {
  private store: StoreContext;

  constructor(store: StoreContext) {
    this.store = store;
  }

  public async processIntake(payload: TriggerPayload, triggerType: TriggerType): Promise<TriggerResult> {
    const rawUrl = (payload.sourceUrl || '').trim();
    let rawText = (payload.sourceText || '').trim();
    let rawName = (payload.sourceName || '').trim();
    const sourceType = payload.sourceType || 'Public Source';
    const categoryHint = payload.category || this.store.getDefaultCategory();
    const notes = (payload.notes || '').trim();

    // 1. Validation: ensure at least URL or Text is present
    if (!rawUrl && !rawText) {
      this.logTriggerEvent(triggerType, rawName || 'Unknown Source', 'Failed', 'Missing both URL and source text.');
      return {
        success: false,
        message: 'Validation failed: A source URL or original text must be provided.',
        triggerType,
        error: 'Missing required payload data (sourceUrl or sourceText).',
      };
    }

    let extractedImageUrl: string | undefined = payload.imageUrl ? payload.imageUrl.trim() : undefined;

    if (rawUrl) {
      try {
        const parsedUrl = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid URL protocol. Must start with http:// or https://');
        }
        if (!rawName) {
          rawName = parsedUrl.hostname.replace(/^www\./i, '');
        }

        // Attempt fault-tolerant URL metadata and image extraction
        try {
          const urlInfo = await extractUrlMetadataAndImage(rawUrl);
          if (urlInfo.imageUrl && !extractedImageUrl) {
            extractedImageUrl = urlInfo.imageUrl;
          }
          if (urlInfo.sourceName && !payload.sourceName) {
            rawName = urlInfo.sourceName;
          }
          // If text was empty or placeholder, enrich with extracted title and description
          if (!rawText || rawText === rawUrl) {
            const parts: string[] = [];
            if (urlInfo.title) parts.push(urlInfo.title);
            if (urlInfo.description) parts.push(urlInfo.description);
            if (parts.length > 0) {
              rawText = parts.join('\n\n');
            }
          }
        } catch (extractErr) {
          console.warn(`[ContentProcessor] Metadata/image extraction skipped for ${rawUrl}:`, extractErr);
        }
      } catch (err: any) {
        this.logTriggerEvent(triggerType, rawUrl, 'Failed', `Invalid URL format: ${err.message}`);
        return {
          success: false,
          message: 'Validation failed: Source URL is invalid.',
          triggerType,
          error: `Invalid source URL format: ${err.message}`,
        };
      }
    }

    if (!rawName) {
      rawName = `Manual Intake (${triggerType})`;
    }

    // 2. Create SourcePost Record (Each addition is independent - no duplicate blocks)
    const sourcePostId = `srcpost-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nowIso = new Date().toISOString();

    const sourcePostRecord: SourcePost = {
      id: sourcePostId,
      sourceUrl: rawUrl || `https://local-intake.internal/${sourcePostId}`,
      sourceName: rawName,
      sourceType,
      sourceText: rawText || `[Source Link Input: ${rawUrl}]`,
      triggerType,
      receivedAt: nowIso,
      status: 'NEW',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.store.addSourcePost(sourcePostRecord);
    this.logTriggerEvent(triggerType, rawName, 'Received', `Ingested source payload via ${triggerType}`);

    // 3. Create initial Post in Content Queue (Independent record)
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newPost: Post = {
      id: postId,
      sourceUrl: sourcePostRecord.sourceUrl,
      originalText: sourcePostRecord.sourceText,
      sourceName: sourcePostRecord.sourceName,
      category: categoryHint,
      notes,
      imageUrl: extractedImageUrl,
      status: 'Processing',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.store.addPost(newPost);
    this.store.logActivity('post_added', `New source post ingested via ${triggerType} (${rawName})`, newPost.id);
    this.store.save();

    // 4. Run OpenRouter AI Pipeline if API Key is configured
    if (!isOpenRouterConfigured()) {
      newPost.status = 'New';
      newPost.error = 'OpenRouter API key is not configured. Post added to queue for manual AI trigger.';
      this.store.updatePost(postId, newPost);
      this.store.updateSourcePost(sourcePostId, { status: 'PROCESSED', processedAt: new Date().toISOString() });
      this.logTriggerEvent(triggerType, rawName, 'Processed', 'Post queued; OpenRouter API key missing.');
      this.store.save();

      return {
        success: true,
        message: 'Source post received and queued. OpenRouter AI is currently not configured; post is ready for manual AI processing.',
        triggerType,
        sourcePost: sourcePostRecord,
        post: newPost,
      };
    }

    try {
      const writingStyle = this.store.getWritingStyle() || 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)';
      const brandName = this.store.getBrandName() || 'Social AutoPilot Hub';

      const aiResult = await callOpenRouterAI({
        sourceName: newPost.sourceName,
        categoryHint: newPost.category,
        originalText: newPost.originalText,
        writingStyle,
        brandName,
      });

      newPost.category = aiResult.category;
      newPost.aiRewrite = aiResult.aiRewrite;
      newPost.headline = aiResult.headline;
      newPost.hashtags = aiResult.hashtags;
      newPost.summary = aiResult.summary;
      newPost.keyFacts = aiResult.keyFacts;
      newPost.importantClaims = aiResult.importantClaims;

      const hasUnverified = (newPost.importantClaims as string[]).some((claim) =>
        claim.toLowerCase().includes('needs verification')
      );
      newPost.verificationStatus = hasUnverified ? 'Needs Verification' : 'Confirmed';
      newPost.sourceAttribution = newPost.sourceName ? `Source: ${newPost.sourceName}` : '';
      newPost.emojis = aiResult.emojis;
      newPost.aiAnalysis = {
        topic: aiResult.topic || 'General Topic',
        summary: aiResult.summary || '',
        keyFacts: newPost.keyFacts as string[],
        importantClaims: newPost.importantClaims as string[],
        whyInteresting: aiResult.whyInteresting || '',
        detectedType: aiResult.category,
      };
      newPost.status = 'Ready';
      newPost.processedAt = new Date().toISOString();
      newPost.updatedAt = new Date().toISOString();
      newPost.error = undefined;

      this.store.updatePost(postId, newPost);
      this.store.updateSourcePost(sourcePostId, {
        status: 'PROCESSED',
        processedAt: new Date().toISOString(),
      });

      this.store.logActivity('post_processed', `Trigger ${triggerType} successfully processed post with OpenRouter AI`, newPost.id);
      this.logTriggerEvent(triggerType, rawName, 'Processed', `Processed & AI rewritten into "${newPost.headline || 'Post'}"`);
      this.store.save();

      return {
        success: true,
        message: 'Source post received and processed successfully through OpenRouter AI pipeline.',
        triggerType,
        sourcePost: sourcePostRecord,
        post: newPost,
      };
    } catch (err: any) {
      console.error(`Trigger processing OpenRouter AI error:`, err);

      newPost.status = 'New';
      newPost.error = `OpenRouter AI auto-processing paused: ${err.message || 'Error'}. You can retry AI processing from the queue.`;
      newPost.updatedAt = new Date().toISOString();

      this.store.updatePost(postId, newPost);
      this.store.updateSourcePost(sourcePostId, { status: 'PROCESSED', processedAt: new Date().toISOString() });
      this.logTriggerEvent(triggerType, rawName, 'Processed', `Post added to queue; OpenRouter AI paused (${err.message || 'Error'})`);
      this.store.save();

      return {
        success: true,
        message: `Source post added to Content Queue. OpenRouter AI processing was paused: ${err.message || 'Error'}`,
        triggerType,
        sourcePost: sourcePostRecord,
        post: newPost,
      };
    }
  }

  private logTriggerEvent(trigger: TriggerType, source: string, status: 'Received' | 'Processed' | 'Failed' | 'Ignored', details?: string) {
    const log: TriggerActivityLog = {
      id: `trig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      trigger,
      source,
      status,
      details,
    };
    this.store.addTriggerLog(log);
  }
}
