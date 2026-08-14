import express from 'express';
import serverless from 'serverless-http';
import {
  store,
  loadStore,
  reloadStore,
  saveStore,
  logActivity,
  extractPostIdFromRequest,
  findPostById,
} from '../../server/store.js';
import { Post } from '../../src/types.js';
import { callOpenRouterAI, isOpenRouterConfigured } from '../../server/openrouterService.js';

const app = express();
app.use(express.json());

const processHandler = async (req: express.Request, res: express.Response) => {
  let targetId = extractPostIdFromRequest(req);
  let found = findPostById(targetId);

  // If not found in store but post payload is present, hydrate into store (resilience across containers/cold starts)
  if (!found && req.body && (req.body.post || req.body.originalText)) {
    const postPayload = req.body.post || req.body;
    const hydratedId = postPayload.id || targetId || `post-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    targetId = hydratedId;

    const hydratedPost: Post = {
      id: hydratedId,
      sourceUrl: postPayload.sourceUrl || '',
      originalText: postPayload.originalText || '',
      sourceName: postPayload.sourceName || 'Manual Submission',
      category: postPayload.category || store.settings.defaultCategory || 'General',
      notes: postPayload.notes || '',
      status: 'Processing',
      createdAt: postPayload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.posts.unshift(hydratedPost);
    saveStore();
    found = { post: hydratedPost, index: 0 };
  }

  console.log(`[Diagnostic][Netlify Gemini] Process Post Request - rawParam: "${req.params?.id}", bodyId: "${req.body?.id}", normalizedId: "${targetId}", found: ${Boolean(found)}`);

  if (!found) {
    return res.status(404).json({
      error: 'Post not found',
      requestedId: targetId,
      availableIds: store.posts.map((p) => p.id),
    });
  }

  if (!isOpenRouterConfigured()) {
    return res.status(400).json({
      error: 'OpenRouter AI is not configured yet. Add OPENROUTER_API_KEY in the deployment environment.',
    });
  }

  const { post, index: postIndex } = found;

  post.status = 'Processing';
  post.updatedAt = new Date().toISOString();
  store.posts[postIndex] = post;
  saveStore();

  try {
    const writingStyle = store.settings.writingStyle || 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)';
    const brandName = store.settings.brandName || 'Social AutoPilot Hub';

    const aiResult = await callOpenRouterAI({
      sourceName: post.sourceName,
      categoryHint: post.category,
      originalText: post.originalText,
      writingStyle,
      brandName,
    });

    post.category = aiResult.category;
    post.aiRewrite = aiResult.aiRewrite;
    post.headline = aiResult.headline;
    post.hashtags = aiResult.hashtags;
    post.summary = aiResult.summary;
    post.keyFacts = aiResult.keyFacts;
    post.importantClaims = aiResult.importantClaims;

    const hasUnverifiedClaim = (post.importantClaims as string[]).some(
      (claim) => claim.toLowerCase().includes('needs verification') || claim.toLowerCase().includes('unverified')
    );
    post.verificationStatus = hasUnverifiedClaim ? 'Needs Verification' : 'Confirmed';

    if (post.sourceName && post.sourceName.trim()) {
      post.sourceAttribution = `Source: ${post.sourceName.trim()}`;
    } else {
      post.sourceAttribution = '';
    }

    post.emojis = aiResult.emojis;
    post.aiAnalysis = {
      topic: aiResult.topic || 'General Topic',
      summary: aiResult.summary || '',
      keyFacts: post.keyFacts as string[],
      importantClaims: post.importantClaims as string[],
      whyInteresting: aiResult.whyInteresting || '',
      detectedType: aiResult.category,
    };
    post.status = 'Ready';
    post.processedAt = new Date().toISOString();
    post.updatedAt = new Date().toISOString();
    post.error = undefined;

    store.posts[postIndex] = post;
    logActivity('post_processed', `Processed post with OpenRouter AI (${aiResult.category})`, post.id);
    saveStore();

    return res.json({
      message: 'Post successfully processed with OpenRouter AI',
      post,
    });
  } catch (err: any) {
    console.error(`OpenRouter AI processing error for post ${post.id}:`, err);

    post.status = 'Failed';
    post.error = err?.message || 'OpenRouter processing failed. Please check network/key and try again.';
    post.updatedAt = new Date().toISOString();

    store.posts[postIndex] = post;
    logActivity('status_changed', `OpenRouter AI processing failed for post ${post.id}: ${post.error}`, post.id);
    saveStore();

    return res.status(500).json({
      error: 'OpenRouter AI processing failed',
      details: post.error,
      post,
    });
  }
};

app.post('*', processHandler);

export const handler = serverless(app);
