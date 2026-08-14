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
import {
  getFacebookConfig,
  getFacebookAuthUrl,
  handleFacebookOAuthCallback,
  mapOAuthError,
} from '../../server/facebookService.js';
import { publishToFacebookPage } from '../../server/facebookPublisher.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/facebook')) {
    req.url = req.url.replace('/.netlify/functions/facebook', '/api/facebook');
  }
  next();
});

// GET /api/facebook/login
app.get(['/api/facebook/login', '/.netlify/functions/facebook/login'], (req, res) => {
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

// Callback handler
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

app.get(['/api/facebook/callback', '/.netlify/functions/facebook/callback'], handleFbCallback);
app.get(['/api/auth/facebook/callback', '/.netlify/functions/facebook/auth/callback'], handleFbCallback);

// GET /api/facebook/status
app.get(['/api/facebook/status', '/.netlify/functions/facebook/status'], (_req, res) => {
  const config = getFacebookConfig();
  const currentStore = loadStore();
  const fbData = currentStore.facebook;
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

// POST /api/facebook/select-page
app.post(['/api/facebook/select-page', '/.netlify/functions/facebook/select-page'], (req, res) => {
  const { pageId } = req.body || {};
  const currentStore = loadStore();
  if (!currentStore.facebook || !currentStore.facebook.connected) {
    return res.status(400).json({ error: 'Facebook account is not connected.' });
  }

  const available = currentStore.facebook.availablePages || [];
  const matchedPage = available.find((p) => p.id === pageId);

  if (!matchedPage) {
    return res.status(404).json({ error: 'Requested Facebook Page was not found in authorized pages list.' });
  }

  store.facebook = {
    ...currentStore.facebook,
    selectedPage: matchedPage,
  };
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

// POST /api/facebook/disconnect
app.post(['/api/facebook/disconnect', '/.netlify/functions/facebook/disconnect'], (_req, res) => {
  const currentStore = loadStore();
  if (currentStore.facebook?.connected) {
    const prevName = currentStore.facebook.user?.name || 'Facebook';
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

// POST /api/facebook/publish
app.post(['/api/facebook/publish', '/.netlify/functions/facebook/publish', '/api/facebook/publish/:id', '/.netlify/functions/facebook/publish/:id'], async (req, res) => {
  let targetId = extractPostIdFromRequest(req);
  let found = findPostById(targetId);

  // If not found in store but post payload is present, hydrate into store (resilience across serverless cold starts)
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
    console.log(`[Diagnostic][Publish][Netlify] Hydrated post "${hydratedId}" into store from request payload.`);
  }

  const currentStore = loadStore();
  const selectedPageId = currentStore.facebook?.selectedPage?.id || 'none';
  console.log(`[Diagnostic][Publish][Netlify] Request received - rawPostId: "${req.body?.postId || ''}", rawId: "${req.body?.id || ''}", normalizedId: "${targetId || ''}", foundInQueue: ${Boolean(found)}, selectedPageId: "${selectedPageId}", fbConnected: ${Boolean(currentStore.facebook?.connected)}`);

  if (!found) {
    return res.status(404).json({
      error: 'Post not found in queue.',
      requestedId: targetId,
      availableIds: store.posts.map((p) => p.id),
    });
  }

  const { post, index: postIndex } = found;
  if (post.status !== 'Approved') {
    return res.status(400).json({
      error: 'Only posts with Approved status can be published. Please review and approve the post first.',
      currentStatus: post.status,
    });
  }

  if (!currentStore.facebook || !currentStore.facebook.connected || !currentStore.facebook.selectedPage) {
    return res.status(400).json({
      error: 'Connect a Facebook Page before publishing. Please configure your Facebook Page connection in Settings.',
    });
  }

  const selectedPage = currentStore.facebook.selectedPage;
  if (!selectedPage.accessToken) {
    return res.status(400).json({
      error: 'Missing Page Access Token for selected Facebook Page. Please reconnect your Facebook Page in Settings.',
    });
  }

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
    post.publishedAt = new Date().toISOString();
    post.facebookStatus = 'PUBLISHED';
    post.facebookPostId = publishRes.id;
    post.facebookPostUrl = publishRes.facebookPostUrl;
    post.publishError = undefined;
    post.updatedAt = new Date().toISOString();

    store.posts[postIndex] = post;
    logActivity('post_published', `Published post "${post.headline || post.id}" to Facebook Page "${selectedPage.name}" (Meta Post ID: ${publishRes.id})`, post.id);
    saveStore();

    console.log(`[Diagnostic][Publish][Netlify] Post "${post.id}" published successfully to Page "${selectedPage.id}" (Meta Post ID: ${publishRes.id})`);

    return res.json({
      message: `Successfully published post to Facebook Page "${selectedPage.name}"`,
      facebookPostId: publishRes.id,
      post,
    });
  } catch (err: any) {
    console.error(`Facebook Page publishing error for post ${post.id}:`, err);

    post.facebookStatus = 'FAILED';
    post.publishError = err?.message || 'Failed to publish post to Facebook Page.';
    post.updatedAt = new Date().toISOString();

    store.posts[postIndex] = post;
    logActivity('publish_failed', `Failed to publish post "${post.id}" to Facebook: ${post.publishError}`, post.id);
    saveStore();

    console.log(`[Diagnostic][Publish][Netlify] Post "${post.id}" publish failed: ${post.publishError}`);

    return res.status(400).json({
      error: 'Failed to publish post to Facebook Page.',
      details: post.publishError,
      post,
    });
  }
});

export const handler = serverless(app);
