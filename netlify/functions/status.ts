import express from 'express';
import serverless from 'serverless-http';
import { store } from '../../server/store.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/status')) {
    req.url = req.url.replace('/.netlify/functions/status', '/api/status');
  }
  next();
});

// GET /api/status
app.get(['/api/status', '/.netlify/functions/status'], (_req, res) => {
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

  const isAiConnected = Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim().length > 0);
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
      aiProvider: 'OpenRouter',
      publishingAutomation,
      scheduledAutomation,
    },
  });
});

export const handler = serverless(app);
