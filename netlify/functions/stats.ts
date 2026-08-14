import express from 'express';
import serverless from 'serverless-http';
import { store, loadStore, getDestinationConfig } from '../../server/store.js';
import { TriggerManager } from '../../server/triggers/index.js';
import { storeContext } from '../../server/store.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/stats')) {
    req.url = req.url.replace('/.netlify/functions/stats', '/api/stats');
  }
  next();
});

const triggerManager = new TriggerManager(storeContext);

app.get(['/api/stats', '/.netlify/functions/stats'], (_req, res) => {
  const currentStore = loadStore();
  const totalProcessed = currentStore.posts.filter(
    (p) => p.status === 'Ready' || p.status === 'Approved' || p.status === 'Published'
  ).length;
  const waitingForApproval = currentStore.posts.filter((p) => p.status === 'Ready').length;
  const published = currentStore.posts.filter((p) => p.status === 'Published').length;
  const totalApproved = currentStore.posts.filter((p) => p.status === 'Approved').length;
  const publishedToFacebook = currentStore.posts.filter(
    (p) => p.facebookStatus === 'PUBLISHED'
  ).length;
  const failedPublications = currentStore.posts.filter((p) => p.facebookStatus === 'FAILED').length;

  res.json({
    stats: {
      totalProcessed,
      waitingForApproval,
      published,
      totalApproved,
      publishedToFacebook,
      failedPublications,
      automationStatus: 'Phase 9 Active — Flexible Source Trigger Architecture',
      lastProcessedPost: currentStore.posts.length > 0 ? currentStore.posts[0] : null,
      recentActivities: currentStore.activities.slice(0, 10),
      triggerProviders: triggerManager.getProvidersInfo(),
      triggerLogs: (currentStore.triggerLogs || []).slice(0, 15),
    },
  });
});

export const handler = serverless(app);
