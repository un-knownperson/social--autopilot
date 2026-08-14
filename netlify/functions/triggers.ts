import express from 'express';
import serverless from 'serverless-http';
import { store, loadStore, storeContext } from '../../server/store.js';
import { TriggerManager } from '../../server/triggers/index.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/triggers')) {
    req.url = req.url.replace('/.netlify/functions/triggers', '/api/triggers');
  }
  next();
});

const triggerManager = new TriggerManager(storeContext);

// POST /api/source/intake
app.post(['/api/source/intake', '/.netlify/functions/triggers/intake'], async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const secretHeader = (req.headers['x-webhook-secret'] as string) || '';
    const webhookSecretEnv = process.env.WEBHOOK_SECRET;

    const payload = {
      ...req.body,
      authHeader,
      secretHeader,
      webhookSecretEnv,
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

// GET /api/triggers/providers
app.get(['/api/triggers/providers', '/.netlify/functions/triggers/providers'], (_req, res) => {
  res.json({ providers: triggerManager.getProvidersInfo() });
});

// GET /api/triggers/logs
app.get(['/api/triggers/logs', '/.netlify/functions/triggers/logs'], (_req, res) => {
  const currentStore = loadStore();
  res.json({ logs: currentStore.triggerLogs || [] });
});

// GET /api/source-posts
app.get(['/api/source-posts', '/.netlify/functions/triggers/source-posts'], (_req, res) => {
  const currentStore = loadStore();
  res.json({ sourcePosts: currentStore.sourcePosts || [] });
});

export const handler = serverless(app);
