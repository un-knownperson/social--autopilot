import { SourcePost, Post, PostCategory, TriggerType, TriggerActivityLog } from '../../src/types.js';
import { TriggerPayload, TriggerResult } from './types.js';
import { processContentWithAi } from '../aiService.js';
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

  /**
   * Processes incoming content following the priority-based ingestion system:
   * 1. Priority A: Native Share Data (Immediate text + image if provided by Share Sheet / Web Share)
   * 2. Priority B: Direct Image URL (If source URL points directly to an image asset)
   * 3. Priority C: Public Page Metadata (og:image, og:description, meta tags, schema.org)
   * 4. Priority D: Facebook Fallback (Preserve shared Facebook URL & text; never fail fatally on login walls)
   * 5. Priority E: Manual Content Input
   *
   * Ensures:
   * - ZERO duplicate checks (same URL, text, or image can be added indefinitely)
   * - Text + Image stay together in the same source post record
   * - AI failures or rate limits never destroy the intake workflow (non-blocking fallback)
   */
  public async processIntake(payload: TriggerPayload, triggerType: TriggerType): Promise<TriggerResult> {
    const rawUrl = (payload.sourceUrl || '').trim();
    let rawText = (payload.sourceText || '').trim();
    let rawName = (payload.sourceName || '').trim();
    const sourceType = payload.sourceType || 'Public Source';
    const categoryHint = payload.category || this.store.getDefaultCategory();
    const notes = (payload.notes || '').trim();
    let extractedImageUrl: string | undefined = payload.imageUrl ? payload.imageUrl.trim() : undefined;
    let nonBlockingWarning: string | undefined = undefined;

    // 1. Basic validation: require at least URL, text, or image
    if (!rawUrl && !rawText && !extractedImageUrl) {
      this.logTriggerEvent(triggerType, rawName || 'Unknown Source', 'Failed', 'Missing source URL, text, or image.');
      return {
        success: false,
        message: 'Validation failed: A source URL, post text, or image must be provided.',
        triggerType,
        error: 'Missing required payload content.',
      };
    }

    // 2. Multi-Source Metadata & Media Extraction
    if (rawUrl) {
      try {
        const parsedUrl = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('Invalid URL protocol. Must start with http:// or https://');
        }
        if (!rawName) {
          rawName = parsedUrl.hostname.replace(/^www\./i, '');
        }

        // Only scrape if we don't already have both rich text and image from Native Share Sheet
        const needsScraping = !rawText || !extractedImageUrl;

        if (needsScraping) {
          try {
            const urlInfo = await extractUrlMetadataAndImage(rawUrl);
            if (urlInfo.imageUrl && !extractedImageUrl) {
              extractedImageUrl = urlInfo.imageUrl;
            }
            if (urlInfo.sourceName && !payload.sourceName) {
              rawName = urlInfo.sourceName;
            }
            if (urlInfo.facebookNotice) {
              nonBlockingWarning = urlInfo.facebookNotice;
            }

            // Populate text from extracted title & description if none was supplied
            if (!rawText || rawText === rawUrl) {
              const parts: string[] = [];
              if (urlInfo.title) parts.push(urlInfo.title);
              if (urlInfo.description) parts.push(urlInfo.description);
              if (parts.length > 0) {
                rawText = parts.join('\n\n');
              }
            }
          } catch (extractErr: any) {
            console.warn(`[ContentProcessor] Non-blocking metadata extraction note for ${rawUrl}:`, extractErr?.message);
          }
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

    if (!rawText) {
      rawText = rawUrl ? `[Shared Link: ${rawUrl}]` : 'Shared Post Content';
    }

    // 3. Create Unique SourcePost Record (Zero duplicate restrictions)
    const sourcePostId = `srcpost-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    const sourcePostRecord: SourcePost = {
      id: sourcePostId,
      sourceUrl: rawUrl || `https://local-intake.internal/${sourcePostId}`,
      sourceName: rawName,
      sourceType,
      sourceText: rawText,
      triggerType,
      receivedAt: nowIso,
      status: 'NEW',
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.store.addSourcePost(sourcePostRecord);
    this.logTriggerEvent(triggerType, rawName, 'Received', `Ingested source post with media and text via ${triggerType}`);

    // 4. Create Unique Post in Content Queue
    const postId = `post-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newPost: Post = {
      id: postId,
      sourceUrl: sourcePostRecord.sourceUrl,
      originalText: rawText,
      sourceName: rawName,
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

    // 5. Execute Resilient AI Pipeline (Gemini -> OpenRouter -> Non-blocking Fallback)
    try {
      const writingStyle = this.store.getWritingStyle() || 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)';
      const brandName = this.store.getBrandName() || 'Social AutoPilot Hub';

      const aiResult = await processContentWithAi({
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

      if (aiResult.warning || nonBlockingWarning) {
        newPost.error = [aiResult.warning, nonBlockingWarning].filter(Boolean).join(' | ');
      } else {
        newPost.error = undefined;
      }

      this.store.updatePost(postId, newPost);
      this.store.updateSourcePost(sourcePostId, {
        status: 'PROCESSED',
        processedAt: new Date().toISOString(),
      });

      this.store.logActivity('post_processed', `Content ingested and prepared via ${triggerType} [${aiResult.provider.toUpperCase()}]`, newPost.id);
      this.logTriggerEvent(triggerType, rawName, 'Processed', `Post ready in queue: "${newPost.headline || 'Post'}"`);
      this.store.save();

      return {
        success: true,
        message: 'Source content and media successfully received, processed, and added to the Content Queue.',
        triggerType,
        sourcePost: sourcePostRecord,
        post: newPost,
      };
    } catch (err: any) {
      console.warn(`[ContentProcessor] Fallback post protection triggered:`, err);

      newPost.status = 'Ready';
      newPost.aiRewrite = newPost.originalText;
      newPost.error = `AI auto-rewrite warning: ${err.message || 'Unavailable'}. Original text and media are ready to review and publish.`;
      newPost.updatedAt = new Date().toISOString();

      this.store.updatePost(postId, newPost);
      this.store.updateSourcePost(sourcePostId, { status: 'PROCESSED', processedAt: new Date().toISOString() });
      this.logTriggerEvent(triggerType, rawName, 'Processed', `Post queued with original content intact.`);
      this.store.save();

      return {
        success: true,
        message: 'Source post and media successfully added to Content Queue with original content intact.',
        triggerType,
        sourcePost: sourcePostRecord,
        post: newPost,
      };
    }
  }

  private logTriggerEvent(triggerType: TriggerType, source: string, status: 'Received' | 'Processed' | 'Failed' | 'Ignored', details: string) {
    const log: TriggerActivityLog = {
      id: `triglog-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      triggerType,
      source,
      status,
      timestamp: new Date().toISOString(),
      details,
    };
    this.store.addTriggerLog(log);
  }
}
