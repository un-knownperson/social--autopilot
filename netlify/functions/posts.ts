import express from 'express';
import serverless from 'serverless-http';
import {
  store,
  loadStore,
  reloadStore,
  saveStore,
  logActivity,
  storeContext,
  extractPostIdFromRequest,
  findPostById,
} from '../../server/store.js';
import { TriggerManager } from '../../server/triggers/index.js';
import { PostStatus, Post } from '../../src/types.js';
import { TriggerPayload } from '../../server/triggers/types.js';
import { callOpenRouterAI, isOpenRouterConfigured } from '../../server/openrouterService.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/posts')) {
    req.url = req.url.replace('/.netlify/functions/posts', '/api/posts');
  }
  next();
});

const triggerManager = new TriggerManager(storeContext);

// GET /api/posts
app.get(['/api/posts', '/.netlify/functions/posts'], (_req, res) => {
  reloadStore();
  res.json({ posts: store.posts });
});

// GET /api/posts/:id
app.get(['/api/posts/:id', '/.netlify/functions/posts/:id'], (req, res) => {
  const targetId = extractPostIdFromRequest(req);
  const found = findPostById(targetId);
  if (!found) {
    return res.status(404).json({ error: 'Post not found', requestedId: targetId });
  }
  res.json({ post: found.post });
});

// POST /api/posts
app.post(['/api/posts', '/.netlify/functions/posts'], async (req, res) => {
  const { sourceUrl, originalText, sourceName, category, notes, triggerType } = req.body || {};

  const payload: TriggerPayload = {
    sourceUrl,
    sourceText: originalText,
    sourceName,
    category,
    notes,
    triggerType: triggerType || (sourceUrl && sourceUrl.trim() ? 'URL' : 'MANUAL'),
  };

  const result = await triggerManager.processTrigger(payload);

  if (!result.success) {
    return res.status(400).json({
      error: result.error || result.message || 'Failed to add source post.',
    });
  }

  res.status(201).json({
    message: result.message || 'Post created successfully and added to Content Queue',
    post: result.post,
    sourcePost: result.sourcePost,
  });
});

// PATCH /api/posts/:id
app.patch(['/api/posts/:id', '/.netlify/functions/posts/:id'], (req, res) => {
  const targetId = extractPostIdFromRequest(req);
  const found = findPostById(targetId);
  if (!found) {
    return res.status(404).json({ error: 'Post not found', requestedId: targetId });
  }

  const { post: current, index: postIndex } = found;
  const {
    status,
    sourceUrl,
    sourceName,
    category,
    notes,
    headline,
    aiRewrite,
    hashtags,
    emojis,
    summary,
    keyFacts,
    imageUrl,
  } = req.body || {};

  let description = `Updated post details for "${current.headline || current.id}"`;
  let isContentEdited = false;

  if (imageUrl !== undefined) {
    current.imageUrl = imageUrl ? imageUrl.trim() : undefined;
  }
  if (headline !== undefined && headline !== current.headline) {
    current.headline = headline;
    isContentEdited = true;
  }
  if (aiRewrite !== undefined && aiRewrite !== current.aiRewrite) {
    current.aiRewrite = aiRewrite;
    isContentEdited = true;
  }
  if (hashtags !== undefined) {
    current.hashtags = hashtags;
    isContentEdited = true;
  }
  if (emojis !== undefined && emojis !== current.emojis) {
    current.emojis = emojis;
    isContentEdited = true;
  }
  if (category !== undefined && category !== current.category) {
    current.category = category;
    isContentEdited = true;
  }
  if (summary !== undefined && summary !== current.summary) {
    current.summary = summary;
    isContentEdited = true;
  }
  if (keyFacts !== undefined) {
    current.keyFacts = keyFacts;
    isContentEdited = true;
  }

  if (sourceUrl !== undefined) current.sourceUrl = sourceUrl.trim();
  if (sourceName !== undefined) current.sourceName = sourceName.trim();
  if (notes !== undefined) current.notes = notes.trim();

  if (isContentEdited && current.status === 'Approved' && !status) {
    current.status = 'Ready';
    description = `Edited content for approved post "${current.headline || current.id}"; status reset to Ready for Review`;
  } else if (status && status !== current.status) {
    const validStatuses: PostStatus[] = ['New', 'Processing', 'Ready', 'Approved', 'Published', 'Rejected', 'Failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid post status' });
    }
    current.status = status;
    if (status === 'Approved') {
      current.approvedAt = new Date().toISOString();
      description = `Approved post "${current.headline || current.id}"`;
    } else if (status === 'Rejected') {
      description = `Rejected post "${current.headline || current.id}"`;
    } else if (status === 'Ready') {
      description = `Marked post "${current.headline || current.id}" as Ready for Review`;
    } else {
      description = `Changed status of post "${current.headline || current.id}" to "${status}"`;
    }
  }

  current.updatedAt = new Date().toISOString();
  store.posts[postIndex] = current;

  logActivity('status_changed', description, current.id);
  saveStore();

  res.json({ message: 'Post updated successfully', post: current });
});

// DELETE /api/posts/:id
app.delete(['/api/posts/:id', '/.netlify/functions/posts/:id'], (req, res) => {
  const targetId = extractPostIdFromRequest(req);
  const found = findPostById(targetId);
  if (!found) {
    return res.status(404).json({ error: 'Post not found', requestedId: targetId });
  }

  const { post } = found;
  store.posts = store.posts.filter((p) => p.id !== post.id);
  logActivity('post_deleted', `Deleted post "${post.id}" (${post.category})`, post.id);
  saveStore();

  res.json({ message: 'Post deleted successfully', id: post.id });
});

// POST /api/posts/:id/process
app.post(['/api/posts/:id/process', '/.netlify/functions/posts/:id/process', '/api/posts/process', '/.netlify/functions/posts/process'], async (req, res) => {
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

    if (hasUnverifiedClaim) {
      post.sourceAttribution = post.sourceUrl ? `Source: ${post.sourceUrl}` : '';
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
});

export const handler = serverless(app);
