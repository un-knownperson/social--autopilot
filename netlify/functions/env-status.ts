import express from 'express';
import serverless from 'serverless-http';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/env-status')) {
    req.url = req.url.replace('/.netlify/functions/env-status', '/api/env-status');
  }
  next();
});

// GET /api/env-status
app.get(['/api/env-status', '/.netlify/functions/env-status'], (_req, res) => {
  const openrouterConfigured = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
  const fbAppIdConfigured = Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_ID.trim().length > 0);
  const fbAppSecretConfigured = Boolean(process.env.FACEBOOK_APP_SECRET && process.env.FACEBOOK_APP_SECRET.trim().length > 0);
  const fbRedirectUriConfigured = Boolean(process.env.FACEBOOK_REDIRECT_URI && process.env.FACEBOOK_REDIRECT_URI.trim().length > 0);

  const effectiveRedirectUri = process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/api/auth/facebook/callback';

  res.json({
    openrouter: {
      configured: openrouterConfigured,
      status: openrouterConfigured ? 'Configured' : 'Missing OPENROUTER_API_KEY',
      model: 'openrouter/free',
    },
    gemini: {
      configured: openrouterConfigured,
      status: openrouterConfigured ? 'Configured (OpenRouter)' : 'Missing OPENROUTER_API_KEY',
    },
    facebookAppId: {
      configured: fbAppIdConfigured,
      status: fbAppIdConfigured ? 'Configured' : 'Missing FACEBOOK_APP_ID',
    },
    facebookAppSecret: {
      configured: fbAppSecretConfigured,
      status: fbAppSecretConfigured ? 'Configured' : 'Missing FACEBOOK_APP_SECRET',
    },
    facebookRedirectUri: {
      configured: fbRedirectUriConfigured,
      status: fbRedirectUriConfigured ? 'Configured' : 'Using default localhost fallback',
      effectiveUri: effectiveRedirectUri,
    },
    overallConfigured: openrouterConfigured && fbAppIdConfigured && fbAppSecretConfigured,
    deploymentEnvironment: process.env.NETLIFY ? 'Netlify Serverless Platform' : 'Node.js Express Engine',
  });
});

export const handler = serverless(app);
