import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  callOpenRouterAI,
  isOpenRouterConfigured,
  isAiConfigured,
  isGeminiConfigured,
} from './server/openrouterService.js';
import { getAiProviderInfo, processContentWithAi } from './server/aiService.js';
import {
  Post,
  Settings,
  ActivityLog,
  PostCategory,
  PostStatus,
  FacebookPage,
  SourceConfig,
  DestinationConfig,
  AutomationRules,
  SourcePost,
  TriggerActivityLog,
} from './src/types.js';
import {
  getFacebookConfig,
  getFacebookAuthUrl,
  handleFacebookOAuthCallback,
  mapOAuthError,
} from './server/facebookService.js';
import { publishToFacebookPage } from './server/facebookPublisher.js';
import { TriggerManager, StoreContext, TriggerPayload } from './server/triggers/index.js';
import { extractUrlMetadataAndImage } from './server/urlExtractor.js';
import { editImageWithAI, isGeminiImageEditingConfigured } from './server/imageEditService.js';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Express middleware to normalize Netlify function path redirects
app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '/api');
    if (!req.url.startsWith('/api')) {
      req.url = '/api' + req.url;
    }
  } else if (req.url.startsWith('/.netlify/functions/posts')) {
    req.url = req.url.replace('/.netlify/functions/posts', '/api/posts');
  } else if (req.url.startsWith('/.netlify/functions/facebook')) {
    req.url = req.url.replace('/.netlify/functions/facebook', '/api/facebook');
  } else if (req.url.startsWith('/.netlify/functions/triggers')) {
    req.url = req.url.replace('/.netlify/functions/triggers', '/api/triggers');
  } else if (req.url.startsWith('/.netlify/functions/settings')) {
    req.url = req.url.replace('/.netlify/functions/settings', '/api/settings');
  } else if (req.url.startsWith('/.netlify/functions/stats')) {
    req.url = req.url.replace('/.netlify/functions/stats', '/api/stats');
  } else if (req.url.startsWith('/.netlify/functions/status')) {
    req.url = req.url.replace('/.netlify/functions/status', '/api/status');
  } else if (req.url.startsWith('/.netlify/functions/env-status')) {
    req.url = req.url.replace('/.netlify/functions/env-status', '/api/env-status');
  } else if (req.url.startsWith('/.netlify/functions/gemini')) {
    req.url = req.url.replace('/.netlify/functions/gemini', '/api/posts');
  }
  next();
});

import {
  store,
  saveStore,
  logActivity,
  storeContext,
  loadStore,
  reloadStore,
  getDestinationConfig,
  defaultSourceConfig,
  defaultAutomationRules,
  extractPostIdFromRequest,
  findPostById,
} from './server/store.js';

const triggerManager = new TriggerManager(storeContext);

// API Routes

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// POST /share-target - Web Share Target Form Submission Handler
app.post(['/share-target', '/share'], (req, res) => {
  const title = (req.body?.title || req.query?.title || '') as string;
  const text = (req.body?.text || req.query?.text || '') as string;
  const url = (req.body?.url || req.query?.url || '') as string;
  const params = new URLSearchParams();
  if (title) params.set('title', title);
  if (text) params.set('text', text);
  if (url) params.set('url', url);
  return res.redirect(`/share-target?${params.toString()}`);
});

// GET all posts
app.get('/api/posts', (_req, res) => {
  reloadStore();
  res.json({ posts: store.posts });
});

// GET single post
app.get('/api/posts/:id', (req, res) => {
  const targetId = extractPostIdFromRequest(req);
  const found = findPostById(targetId);
  if (!found) {
    return res.status(404).json({ error: 'Post not found', requestedId: targetId });
  }
  res.json({ post: found.post });
});

// POST /api/source/intake - Flexible Share-to-App & Webhook Intake API Endpoint
app.post('/api/source/intake', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const secretHeader = (req.headers['x-webhook-secret'] as string) || '';
    let extractedSecret = secretHeader.trim();
    if (!extractedSecret && authHeader.toLowerCase().startsWith('bearer ')) {
      extractedSecret = authHeader.substring(7).trim();
    }

    const payload: TriggerPayload = {
      sourceUrl: req.body.sourceUrl,
      sourceName: req.body.sourceName,
      sourceText: req.body.sourceText,
      sourceType: req.body.sourceType,
      triggerType: req.body.triggerType,
      category: req.body.category,
      notes: req.body.notes,
      imageUrl: req.body.imageUrl ? String(req.body.imageUrl).trim() : undefined,
      webhookSecret: extractedSecret || req.body.webhookSecret,
    };

    const result = await triggerManager.processTrigger(payload);

    if (!result.success) {
      const isAuthError = result.error?.includes('Unauthorized') || result.message?.includes('authentication failed');
      const isDuplicate = result.message?.includes('Duplicate');
      const statusCode = isAuthError ? 401 : isDuplicate ? 409 : 400;

      return res.status(statusCode).json({
        error: result.error || 'Failed to process intake payload.',
        message: result.message,
        details: result.details,
        triggerType: result.triggerType,
        post: result.post,
      });
    }

    return res.status(201).json({
      success: true,
      message: result.message,
      triggerType: result.triggerType,
      sourcePost: result.sourcePost,
      post: result.post,
    });
  } catch (err: any) {
    console.error('Source intake processing error:', err);
    return res.status(500).json({
      error: 'Internal server error processing source intake request.',
      details: err.message,
    });
  }
});

// GET /api/triggers/providers - Status of all trigger providers
app.get('/api/triggers/providers', (_req, res) => {
  res.json({ providers: triggerManager.getProvidersInfo() });
});

// GET /api/triggers/logs - Trigger activity logs
app.get('/api/triggers/logs', (_req, res) => {
  res.json({ logs: store.triggerLogs || [] });
});

// GET /api/source-posts - List ingested source posts
app.get('/api/source-posts', (_req, res) => {
  res.json({ sourcePosts: store.sourcePosts || [] });
});

// GET /api/ai/status - Status of AI text rewrite providers (Gemini & OpenRouter)
app.get('/api/ai/status', (_req, res) => {
  const info = getAiProviderInfo();
  res.json(info);
});

// GET /api/ai/image-status - Status of AI image editing provider
app.get('/api/ai/image-status', (_req, res) => {
  const configured = isGeminiImageEditingConfigured();
  res.json({
    available: configured,
    provider: 'Google AI Studio / Gemini',
    model: 'gemini-3.1-flash-image',
    note: configured
      ? 'AI Image Editing is available and powered by Google GenAI. Uses your project GEMINI_API_KEY subject to Google AI Studio quotas.'
      : 'GEMINI_API_KEY is not configured in server environment. Set GEMINI_API_KEY in the deployment Settings menu to enable AI Image Editing.',
  });
});

// POST /api/extract-url - Extract text and image from URL before submitting post
app.post('/api/extract-url', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A valid URL is required for metadata and image extraction.' });
  }

  try {
    const info = await extractUrlMetadataAndImage(url.trim());
    return res.json({
      success: true,
      url: url.trim(),
      title: info.title || '',
      description: info.description || '',
      text: [info.title, info.description].filter(Boolean).join('\n\n'),
      imageUrl: info.imageUrl,
      sourceName: info.sourceName || '',
      isDirectImage: Boolean(info.isDirectImage),
      isFacebook: Boolean(info.isFacebook),
      facebookNotice: info.facebookNotice,
      warning: info.warning,
    });
  } catch (err: any) {
    console.warn(`[API /api/extract-url] Extraction warning for ${url}:`, err);
    return res.json({
      success: false,
      url: url.trim(),
      text: '',
      imageUrl: undefined,
      error: err.message || 'Could not extract metadata from URL.',
    });
  }
});

// POST /api/ai/edit-image - Edit an image using AI
app.post('/api/ai/edit-image', async (req, res) => {
  const { imageUrl, prompt, aspectRatio, postId } = req.body;

  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return res.status(400).json({ error: 'An image URL or image data is required for AI editing.' });
  }

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'An editing instruction or prompt is required.' });
  }

  const result = await editImageWithAI({
    imageUrl: imageUrl.trim(),
    prompt: prompt.trim(),
    aspectRatio: aspectRatio || '1:1',
  });

  if (!result.success) {
    return res.status(result.error?.includes('not configured') ? 400 : 502).json({
      error: result.error || 'Failed to edit image with AI.',
      details: result.details,
      originalImageUrl: imageUrl,
      prompt,
    });
  }

  // If a postId was passed and post exists, optionally update post.imageUrl
  if (postId && result.editedImageUrl) {
    const found = findPostById(postId);
    if (found) {
      found.post.imageUrl = result.editedImageUrl;
      found.post.updatedAt = new Date().toISOString();
      saveStore();
      logActivity('post_edited', `Updated image with AI edit for post "${found.post.headline || found.post.id}"`, found.post.id);
    }
  }

  return res.json({
    success: true,
    editedImageUrl: result.editedImageUrl,
    originalImageUrl: result.originalImageUrl,
    prompt: result.prompt,
    provider: result.provider,
    model: result.model,
  });
});

// POST add post
app.post('/api/posts', async (req, res) => {
  const { sourceUrl, originalText, sourceName, category, notes, triggerType, imageUrl } = req.body;

  const payload: TriggerPayload = {
    sourceUrl,
    sourceText: originalText,
    sourceName,
    category,
    notes,
    imageUrl: imageUrl ? imageUrl.trim() : undefined,
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

// PATCH update post (status, text, details, approve, reject)
app.patch('/api/posts/:id', (req, res) => {
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
  } = req.body;

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

  // Rule: If post is edited after approval, automatically reset status back to 'Ready'
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

// DELETE post
app.delete('/api/posts/:id', (req, res) => {
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

// POST process post with AI (Gemini primary, OpenRouter secondary, non-blocking fallback)
app.post(['/api/posts/:id/process', '/api/posts/process'], async (req, res) => {
  let targetId = extractPostIdFromRequest(req);
  let found = findPostById(targetId);

  // If not found in store but post payload is present, hydrate into store
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
      imageUrl: postPayload.imageUrl,
      status: 'Processing',
      createdAt: postPayload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.posts.unshift(hydratedPost);
    saveStore();
    found = { post: hydratedPost, index: 0 };
    console.log(`[Diagnostic] Hydrated post "${hydratedId}" into store from request payload.`);
  }

  if (!found) {
    return res.status(404).json({
      error: 'Post not found',
      requestedId: targetId,
      availableIds: store.posts.map((p) => p.id),
    });
  }

  const { post, index: postIndex } = found;

  post.status = 'Processing';
  post.updatedAt = new Date().toISOString();
  saveStore();

  try {
    const writingStyle = store.settings.writingStyle || 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)';
    const brandName = store.settings.brandName || 'Social AutoPilot Hub';

    const aiResult = await processContentWithAi({
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
    post.error = aiResult.warning || undefined;

    store.posts[postIndex] = post;
    logActivity('post_processed', `Processed post with AI [${aiResult.provider.toUpperCase()}] (${aiResult.category})`, post.id);
    saveStore();

    return res.json({
      message: `Post successfully processed with ${aiResult.provider.toUpperCase()} AI`,
      post,
      provider: aiResult.provider,
    });
  } catch (err: any) {
    console.warn(`[Diagnostic] AI processing fallback for post ${post.id}:`, err);

    post.status = 'Ready';
    post.aiRewrite = post.aiRewrite || post.originalText;
    post.error = `AI auto-rewrite note: ${err?.message || 'Offline fallback in use'}. Content is ready to review.`;
    post.updatedAt = new Date().toISOString();

    store.posts[postIndex] = post;
    logActivity('status_changed', `Post "${post.id}" prepared with fallback content`, post.id);
    saveStore();

    return res.json({
      message: 'Post prepared with original content and non-blocking fallback',
      post,
      provider: 'fallback',
    });
  }
});

// GET settings
app.get('/api/settings', (_req, res) => {
  res.json({ settings: store.settings });
});

// PUT settings
app.put('/api/settings', (req, res) => {
  const { brandName, defaultLanguage, writingStyle, defaultCategory, autoPublishing, requireApproval } = req.body;

  store.settings = {
    brandName: brandName?.trim() || store.settings.brandName,
    defaultLanguage: defaultLanguage?.trim() || store.settings.defaultLanguage,
    writingStyle: writingStyle?.trim() || store.settings.writingStyle,
    defaultCategory: defaultCategory || store.settings.defaultCategory,
    autoPublishing: typeof autoPublishing === 'boolean' ? autoPublishing : store.settings.autoPublishing,
    requireApproval: typeof requireApproval === 'boolean' ? requireApproval : store.settings.requireApproval,
  };

  logActivity('settings_updated', 'Updated system preferences and settings');
  saveStore();

  res.json({ message: 'Settings saved successfully', settings: store.settings });
});

// GET Source Config
app.get('/api/source', (_req, res) => {
  res.json({ source: store.sourceConfig || defaultSourceConfig });
});

// PUT Source Config
app.put('/api/source', (req, res) => {
  const { sourceName, sourceUrl, sourceType, triggerMethod, enabled } = req.body;

  const current = store.sourceConfig || { ...defaultSourceConfig };

  if (sourceName !== undefined) current.sourceName = sourceName.trim();
  if (sourceUrl !== undefined) current.sourceUrl = sourceUrl.trim();
  if (sourceType !== undefined) current.sourceType = sourceType;
  if (triggerMethod !== undefined) current.triggerMethod = triggerMethod;
  if (enabled !== undefined) {
    current.enabled = Boolean(enabled);
    current.status = current.enabled ? 'CONFIGURED' : 'DISABLED';
  }
  current.updatedAt = new Date().toISOString();

  store.sourceConfig = current;
  logActivity('settings_updated', `Updated Source configuration for "${current.sourceName}"`);
  saveStore();

  res.json({ message: 'Source configuration saved successfully', source: current });
});

// POST Test Source Config (Validate configuration & URL format without scraping)
app.post('/api/source/test', (req, res) => {
  const { sourceUrl, sourceName } = req.body;
  const trimmedUrl = (sourceUrl || '').trim();

  if (!trimmedUrl) {
    return res.status(400).json({ valid: false, error: 'Source URL is required.' });
  }

  try {
    const url = new URL(trimmedUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return res.status(400).json({ valid: false, error: 'Invalid URL protocol. Must be HTTP or HTTPS.' });
    }
  } catch (_) {
    return res.status(400).json({ valid: false, error: 'Invalid URL format.' });
  }

  return res.json({
    valid: true,
    message: `Configuration test successful for source "${sourceName || 'Source'}". URL format verified. (Note: Public post content is provided manually during intake; no unauthorized browser scraping is performed).`,
  });
});

// GET Automation Rules
app.get('/api/automation-rules', (_req, res) => {
  res.json({ rules: store.automationRules || defaultAutomationRules });
});

// PUT Automation Rules
app.put('/api/automation-rules', (req, res) => {
  const { autoProcessSource, requireApproval, autoPublishApproved } = req.body;

  const current = store.automationRules || { ...defaultAutomationRules };

  if (typeof autoProcessSource === 'boolean') current.autoProcessSource = autoProcessSource;
  if (typeof requireApproval === 'boolean') current.requireApproval = requireApproval;
  if (typeof autoPublishApproved === 'boolean') current.autoPublishApproved = autoPublishApproved;

  store.automationRules = current;
  logActivity('settings_updated', 'Updated automation pipeline rules');
  saveStore();

  res.json({ message: 'Automation rules saved successfully', rules: current });
});

// --- FACEBOOK OAUTH & PAGE CONNECTION ENDPOINTS ---

// GET /api/facebook/login - Returns OAuth login URL or redirects
app.get('/api/facebook/login', (req, res) => {
  const result = getFacebookAuthUrl();

  if (!result.configured || !result.url) {
    return res.status(400).json({
      configured: false,
      error: result.error || 'Facebook integration is not configured yet.',
    });
  }

  if (req.query.redirect === '1') {
    return res.redirect(result.url);
  }

  res.json({
    configured: true,
    url: result.url,
  });
});

// GET /api/facebook/callback - Process Meta OAuth callback
const handleFbCallback = async (req: express.Request, res: express.Response) => {
  const code = req.query.code as string;
  const rawError = (req.query.error_description || req.query.error_reason || req.query.error || req.query.error_message) as string;

  if (rawError || !code) {
    const mapped = mapOAuthError(rawError || 'invalid_request', rawError || 'Authorization code was missing in callback.');
    logActivity('facebook_disconnected', `Meta Facebook OAuth failed [${mapped.code}]: ${mapped.message}`);
    saveStore();

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Facebook Authentication Error</title></head>
        <body style="background:#090a0f;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:28px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.3);border-radius:16px;max-width:440px;">
            <div style="display:inline-block;padding:8px 16px;background:rgba(244,63,94,0.2);color:#f43f5e;font-size:11px;font-weight:bold;border-radius:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
              OAuth Error: ${mapped.code}
            </div>
            <h3 style="margin:0 0 10px 0;color:#fff;font-size:16px;">${mapped.message}</h3>
            <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.5;">${mapped.details}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'FB_AUTH_ERROR', errorCode: ${JSON.stringify(mapped.code)}, error: ${JSON.stringify(mapped.message)} }, '*');
              setTimeout(() => window.close(), 3500);
            }
          </script>
        </body>
      </html>
    `);
  }

  try {
    const { user, pages } = await handleFacebookOAuthCallback(code);

    // Store tokens securely on server only
    store.facebook = {
      connected: true,
      connectedAt: new Date().toISOString(),
      user,
      availablePages: pages,
      selectedPage: pages.length === 1 ? pages[0] : store.facebook?.selectedPage,
    };

    logActivity('facebook_connected', `Connected Facebook account: ${user.name} (${pages.length} pages found)`);
    saveStore();

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Facebook Authenticated</title></head>
        <body style="background:#090a0f;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:28px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:16px;max-width:400px;">
            <h3 style="margin:0 0 8px 0;color:#818cf8;">Facebook Connected</h3>
            <p style="margin:0;color:#9ca3af;font-size:13px;">Authenticated as <strong>${user.name}</strong>.</p>
            <p style="margin:8px 0 0 0;color:#6b7280;font-size:12px;">Closing window...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'FB_AUTH_SUCCESS' }, '*');
              setTimeout(() => window.close(), 1000);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('Facebook OAuth callback processing error:', err);
    const rawDetails = err?.message || 'Failed to process Facebook login callback.';
    const mapped = mapOAuthError(rawDetails.includes('token') ? 'token_exchange_failed' : 'oauth_error', rawDetails);

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Facebook Authentication Error</title></head>
        <body style="background:#090a0f;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:24px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.3);border-radius:16px;max-width:440px;">
            <div style="display:inline-block;padding:8px 16px;background:rgba(244,63,94,0.2);color:#f43f5e;font-size:11px;font-weight:bold;border-radius:20px;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
              OAuth Error: ${mapped.code}
            </div>
            <h3 style="margin:0 0 10px 0;color:#fff;font-size:16px;">${mapped.message}</h3>
            <p style="margin:0;color:#cbd5e1;font-size:13px;line-height:1.5;">${mapped.details}</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'FB_AUTH_ERROR', errorCode: ${JSON.stringify(mapped.code)}, error: ${JSON.stringify(mapped.message)} }, '*');
              setTimeout(() => window.close(), 3500);
            }
          </script>
        </body>
      </html>
    `);
  }
};

app.get('/api/facebook/callback', handleFbCallback);
app.get('/api/facebook/callback/', handleFbCallback);
app.get('/api/auth/facebook/callback', handleFbCallback);
app.get('/api/auth/facebook/callback/', handleFbCallback);

// GET /api/facebook/status - Return connection & page status without exposing tokens
app.get('/api/facebook/status', (req, res) => {
  const config = getFacebookConfig();

  const fbData = store.facebook;
  const isConnected = Boolean(fbData?.connected);

  const availablePages = (fbData?.availablePages || []).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    picture: p.picture,
  }));

  const selectedPage = fbData?.selectedPage
    ? {
        id: fbData.selectedPage.id,
        name: fbData.selectedPage.name,
        category: fbData.selectedPage.category,
        picture: fbData.selectedPage.picture,
      }
    : undefined;

  res.json({
    configured: config.configured,
    hasAppId: config.hasAppId,
    hasAppSecret: config.hasAppSecret,
    hasRedirectUri: config.hasRedirectUri,
    connected: isConnected,
    connectedAt: fbData?.connectedAt,
    user: fbData?.user,
    availablePages,
    selectedPage,
    publishingStatus: 'Not Configured',
    error: config.error,
  });
});

// POST /api/facebook/select-page - Select a page to manage
app.post('/api/facebook/select-page', (req, res) => {
  const { pageId } = req.body;
  if (!store.facebook || !store.facebook.connected) {
    return res.status(400).json({ error: 'Facebook account is not connected.' });
  }

  const available = store.facebook.availablePages || [];
  const matchedPage = available.find((p) => p.id === pageId);

  if (!matchedPage) {
    return res.status(404).json({ error: 'Requested Facebook Page was not found in authorized pages list.' });
  }

  store.facebook.selectedPage = matchedPage;
  logActivity('page_selected', `Selected Facebook Page: ${matchedPage.name}`);
  saveStore();

  return res.json({
    message: `Selected Facebook Page "${matchedPage.name}"`,
    selectedPage: {
      id: matchedPage.id,
      name: matchedPage.name,
      category: matchedPage.category,
      picture: matchedPage.picture,
    },
    publishingStatus: 'Not Configured',
  });
});

// POST /api/facebook/disconnect - Disconnect Facebook connection
app.post('/api/facebook/disconnect', (_req, res) => {
  if (store.facebook?.connected) {
    const prevName = store.facebook.user?.name || 'Facebook';
    logActivity('facebook_disconnected', `Disconnected Facebook account (${prevName})`);
  }

  store.facebook = {
    connected: false,
  };
  saveStore();

  res.json({
    configured: getFacebookConfig().configured,
    connected: false,
    publishingStatus: 'Not Configured',
  });
});

// POST /api/facebook/publish - Publish approved post to Facebook Page
app.post(['/api/facebook/publish', '/api/facebook/publish/:id'], async (req, res) => {
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
      status: postPayload.status || 'Approved',
      headline: postPayload.headline,
      aiRewrite: postPayload.aiRewrite,
      hashtags: postPayload.hashtags,
      emojis: postPayload.emojis,
      summary: postPayload.summary,
      keyFacts: postPayload.keyFacts,
      importantClaims: postPayload.importantClaims,
      verificationStatus: postPayload.verificationStatus,
      createdAt: postPayload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.posts.unshift(hydratedPost);
    saveStore();
    found = { post: hydratedPost, index: 0 };
    console.log(`[Diagnostic][Publish] Hydrated post "${hydratedId}" into store from request payload.`);
  }

  const selectedPageId = store.facebook?.selectedPage?.id || 'none';
  console.log(`[Diagnostic][Publish] Request received - rawPostId: "${req.body?.postId || ''}", rawId: "${req.body?.id || ''}", normalizedId: "${targetId || ''}", foundInQueue: ${Boolean(found)}, selectedPageId: "${selectedPageId}", fbConnected: ${Boolean(store.facebook?.connected)}`);

  if (!found) {
    return res.status(404).json({
      error: 'Post not found in queue.',
      requestedId: targetId,
      availableIds: store.posts.map((p) => p.id),
    });
  }

  const { post, index: postIndex } = found;

  // Approval Rule: Only posts with status 'Approved' can be published
  if (post.status !== 'Approved') {
    return res.status(400).json({
      error: 'Only posts with Approved status can be published. Please review and approve the post first.',
      currentStatus: post.status,
    });
  }

  // Check Facebook Connection
  if (!store.facebook || !store.facebook.connected || !store.facebook.selectedPage) {
    return res.status(400).json({
      error: 'Connect a Facebook Page before publishing. Please configure your Facebook Page connection in Settings.',
    });
  }

  const selectedPage = store.facebook.selectedPage;
  if (!selectedPage.accessToken) {
    return res.status(400).json({
      error: 'Missing Page Access Token for selected Facebook Page. Please reconnect your Facebook Page in Settings.',
    });
  }

  // Compose message
  const parts: string[] = [];
  if (post.headline && post.headline.trim()) {
    parts.push(post.headline.trim());
  }

  const mainBody = (post.aiRewrite && post.aiRewrite.trim()) ? post.aiRewrite.trim() : post.originalText.trim();
  parts.push(mainBody);

  if (post.hashtags) {
    const tagStr = Array.isArray(post.hashtags) ? post.hashtags.join(' ') : post.hashtags;
    if (tagStr.trim()) {
      parts.push(tagStr.trim());
    }
  }

  const fullMessage = parts.join('\n\n');

  // Mark as PUBLISHING
  post.facebookStatus = 'PUBLISHING';
  post.updatedAt = new Date().toISOString();
  store.posts[postIndex] = post;
  saveStore();

  try {
    const publishRes = await publishToFacebookPage({
      pageId: selectedPage.id,
      pageAccessToken: selectedPage.accessToken,
      message: fullMessage,
    });

    post.status = 'Published';
    post.facebookStatus = 'PUBLISHED';
    post.facebookPostId = publishRes.id;
    post.facebookPostUrl = publishRes.facebookPostUrl;
    post.publishedAt = new Date().toISOString();
    post.publishError = undefined;
    post.updatedAt = new Date().toISOString();

    store.posts[postIndex] = post;
    logActivity(
      'post_published',
      `Published post "${post.headline || post.id}" to Facebook Page "${selectedPage.name}" (Meta Post ID: ${publishRes.id})`,
      post.id
    );
    saveStore();

    console.log(`[Diagnostic][Publish] Post "${post.id}" published successfully to Page "${selectedPage.id}" (Meta Post ID: ${publishRes.id})`);

    return res.json({
      message: `Successfully published post to Facebook Page "${selectedPage.name}"`,
      facebookPostId: publishRes.id,
      post,
    });
  } catch (err: any) {
    console.error('Facebook publish error:', err);
    post.facebookStatus = 'FAILED';
    post.publishError = err.message || 'Facebook publishing failed.';
    post.updatedAt = new Date().toISOString();

    store.posts[postIndex] = post;
    logActivity(
      'publish_failed',
      `Failed to publish post "${post.headline || post.id}" to Facebook Page: ${err.message || err}`,
      post.id
    );
    saveStore();

    console.log(`[Diagnostic][Publish] Post "${post.id}" publish failed: ${post.publishError}`);

    return res.status(400).json({
      error: err.message || 'Failed to publish post to Facebook Page.',
      post,
    });
  }
});

// GET Environment Variable Config Status (without revealing secrets)
app.get('/api/env-status', (req, res) => {
  const fbConfig = getFacebookConfig();
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const openrouterConfigured = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim());
  const aiConfigured = geminiConfigured || openrouterConfigured;
  const fbAppIdConfigured = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_ID.trim());
  const fbAppSecretConfigured = Boolean(process.env.FACEBOOK_APP_SECRET && process.env.FACEBOOK_APP_SECRET.trim());
  const fbRedirectUriConfigured = Boolean(fbConfig.redirectUri);

  res.json({
    gemini: {
      configured: geminiConfigured,
      status: geminiConfigured ? 'Configured' : 'Not Configured',
      model: 'gemini-2.5-flash',
    },
    openrouter: {
      configured: openrouterConfigured,
      status: openrouterConfigured ? 'Configured' : 'Not Configured',
      model: 'openrouter/free',
    },
    aiProvider: geminiConfigured ? 'Google Gemini (gemini-2.5-flash)' : openrouterConfigured ? 'OpenRouter (openrouter/free)' : 'None',
    facebookAppId: {
      configured: fbAppIdConfigured,
      status: fbAppIdConfigured ? 'Configured' : 'Not Configured',
    },
    facebookAppSecret: {
      configured: fbAppSecretConfigured,
      status: fbAppSecretConfigured ? 'Configured' : 'Not Configured',
    },
    facebookRedirectUri: {
      configured: fbRedirectUriConfigured,
      status: fbRedirectUriConfigured ? 'Configured' : 'Not Configured',
      effectiveUri: fbConfig.redirectUri || 'https://<your-site>.run.app/api/facebook/callback',
    },
    overallConfigured: aiConfigured && fbAppIdConfigured && fbAppSecretConfigured && fbRedirectUriConfigured,
    deploymentEnvironment: 'Node.js Express Engine',
  });
});

// GET automation status
app.get('/api/status', (_req, res) => {
  const fbData = store.facebook;

  const hasFbAccount = Boolean(fbData?.connected);
  const selectedPage = fbData?.selectedPage;
  const hasSelectedPage = Boolean(selectedPage?.id);
  const hasPageAccessToken = Boolean(selectedPage?.accessToken);

  const facebookConnection = hasFbAccount && hasSelectedPage
    ? 'Connected'
    : hasFbAccount
    ? 'Page Not Selected'
    : 'Not Connected';

  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const openrouterConfigured = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim());
  const isAiConnected = geminiConfigured || openrouterConfigured;
  const geminiAI = isAiConnected ? 'Connected' : 'Not Configured';

  // Real publishing readiness: Connected FB account + selected destination Page + valid Page Access Token
  const canPublish = Boolean(hasFbAccount && hasSelectedPage && hasPageAccessToken);
  const publishingAutomation = canPublish ? 'Active' : 'Not Configured';

  // Real scheduled automation check: Auto-processing or auto-publishing enabled in rules/settings
  const rules = store.automationRules;
  const isScheduledActive = Boolean(
    store.settings?.autoPublishing ||
    rules?.autoProcessSource ||
    rules?.autoPublishApproved
  );
  const scheduledAutomation = isScheduledActive ? 'Active' : 'Not Configured';

  res.json({
    status: {
      facebookConnection,
      geminiAI,
      aiProvider: geminiConfigured ? 'Gemini 2.5 Flash' : openrouterConfigured ? 'OpenRouter' : 'None',
      publishingAutomation,
      scheduledAutomation,
    },
  });
});

// GET stats summary
app.get('/api/stats', (_req, res) => {
  const totalProcessed = store.posts.length;
  const waitingForApproval = store.posts.filter((p) => p.status === 'New' || p.status === 'Processing' || p.status === 'Ready').length;
  const published = store.posts.filter((p) => p.status === 'Published').length;
  const totalApproved = store.posts.filter((p) => p.status === 'Approved').length;
  const publishedToFacebook = store.posts.filter((p) => p.facebookStatus === 'PUBLISHED').length;
  const failedPublications = store.posts.filter((p) => p.facebookStatus === 'FAILED').length;

  const sortedPosts = [...store.posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const lastProcessedPost = sortedPosts.length > 0 ? sortedPosts[0] : null;

  res.json({
    stats: {
      totalProcessed,
      waitingForApproval,
      published,
      totalApproved,
      publishedToFacebook,
      failedPublications,
      automationStatus: 'Phase 9 Active — Flexible Source Trigger Architecture',
      lastProcessedPost,
      recentActivities: store.activities.slice(0, 10),
      triggerProviders: triggerManager.getProvidersInfo(),
      triggerLogs: (store.triggerLogs || []).slice(0, 10),
    },
  });
});

export { app };

async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.NETLIFY) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === 'production' && !process.env.NETLIFY) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only start listening if executed directly as a standalone process (not required as a function)
  if (!process.env.NETLIFY && process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[Social AutoPilot] Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();

