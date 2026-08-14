import express from 'express';
import serverless from 'serverless-http';
import {
  store,
  loadStore,
  saveStore,
  logActivity,
  defaultSourceConfig,
  defaultAutomationRules,
} from '../../server/store.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  if (req.url.startsWith('/.netlify/functions/settings')) {
    req.url = req.url.replace('/.netlify/functions/settings', '/api/settings');
  }
  next();
});

// GET /api/settings
app.get(['/api/settings', '/.netlify/functions/settings'], (_req, res) => {
  const currentStore = loadStore();
  res.json({ settings: currentStore.settings });
});

// PUT /api/settings
app.put(['/api/settings', '/.netlify/functions/settings'], (req, res) => {
  const currentStore = loadStore();
  const { brandName, defaultLanguage, writingStyle, defaultCategory, autoPublishing, requireApproval } = req.body || {};

  store.settings = {
    brandName: brandName?.trim() || currentStore.settings.brandName,
    defaultLanguage: defaultLanguage?.trim() || currentStore.settings.defaultLanguage,
    writingStyle: writingStyle?.trim() || currentStore.settings.writingStyle,
    defaultCategory: defaultCategory || currentStore.settings.defaultCategory,
    autoPublishing: typeof autoPublishing === 'boolean' ? autoPublishing : currentStore.settings.autoPublishing,
    requireApproval: typeof requireApproval === 'boolean' ? requireApproval : currentStore.settings.requireApproval,
  };

  logActivity('settings_updated', 'Updated system preferences and settings');
  saveStore();

  res.json({ message: 'Settings saved successfully', settings: store.settings });
});

// GET /api/source
app.get(['/api/source', '/.netlify/functions/settings/source'], (_req, res) => {
  const currentStore = loadStore();
  res.json({ source: currentStore.sourceConfig || defaultSourceConfig });
});

// PUT /api/source
app.put(['/api/source', '/.netlify/functions/settings/source'], (req, res) => {
  const currentStore = loadStore();
  const { sourceName, sourceUrl, sourceType, triggerMethod, enabled } = req.body || {};

  const current = currentStore.sourceConfig || { ...defaultSourceConfig };

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

// POST /api/source/test
app.post(['/api/source/test', '/.netlify/functions/settings/source/test'], (req, res) => {
  const { sourceUrl, sourceName } = req.body || {};
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

// GET /api/automation-rules
app.get(['/api/automation-rules', '/.netlify/functions/settings/automation-rules'], (_req, res) => {
  const currentStore = loadStore();
  res.json({ rules: currentStore.automationRules || defaultAutomationRules });
});

// PUT /api/automation-rules
app.put(['/api/automation-rules', '/.netlify/functions/settings/automation-rules'], (req, res) => {
  const currentStore = loadStore();
  const { autoProcessSource, requireApproval, autoPublishApproved } = req.body || {};

  const current = currentStore.automationRules || { ...defaultAutomationRules };

  if (typeof autoProcessSource === 'boolean') current.autoProcessSource = autoProcessSource;
  if (typeof requireApproval === 'boolean') current.requireApproval = requireApproval;
  if (typeof autoPublishApproved === 'boolean') current.autoPublishApproved = autoPublishApproved;

  store.automationRules = current;
  logActivity('settings_updated', 'Updated automation pipeline rules');
  saveStore();

  res.json({ message: 'Automation rules saved successfully', rules: current });
});

export const handler = serverless(app);
