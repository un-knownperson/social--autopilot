import fs from 'fs';
import path from 'path';
import {
  Post,
  ActivityLog,
  Settings,
  SourceConfig,
  AutomationRules,
  FacebookPage,
  TriggerActivityLog,
  SourcePost,
  DestinationConfig,
} from '../src/types.js';
import { StoreContext } from './triggers/index.js';

export interface FacebookStoreData {
  connected: boolean;
  connectedAt?: string;
  user?: {
    id: string;
    name: string;
  };
  availablePages?: FacebookPage[];
  selectedPage?: FacebookPage;
}

export interface DataStore {
  posts: Post[];
  settings: Settings;
  activities: ActivityLog[];
  facebook?: FacebookStoreData;
  sourceConfig?: SourceConfig;
  automationRules?: AutomationRules;
  sourcePosts?: SourcePost[];
  triggerLogs?: TriggerActivityLog[];
}

const DATA_FILE = path.join(process.cwd(), 'data_store.json');
const TMP_DATA_FILE = path.join('/tmp', 'data_store.json');

function getStoreReadPath(): string {
  let hasData = false;
  let hasTmp = false;
  let dataMtime = 0;
  let tmpMtime = 0;

  try {
    if (fs.existsSync(DATA_FILE)) {
      hasData = true;
      dataMtime = fs.statSync(DATA_FILE).mtimeMs;
    }
  } catch (_e) {}

  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      hasTmp = true;
      tmpMtime = fs.statSync(TMP_DATA_FILE).mtimeMs;
    }
  } catch (_e) {}

  if (hasData && hasTmp) {
    return tmpMtime >= dataMtime ? TMP_DATA_FILE : DATA_FILE;
  }
  if (hasTmp) return TMP_DATA_FILE;
  return DATA_FILE;
}

function getStoreWritePath(): string {
  try {
    if (fs.existsSync('/tmp')) {
      return TMP_DATA_FILE;
    }
  } catch (_e) {}
  return DATA_FILE;
}

export const defaultSourceConfig: SourceConfig = {
  sourceId: 'src-101',
  sourceName: 'Public Tech Trends & News',
  sourceUrl: 'https://facebook.com/public-news-feed',
  sourceType: 'Facebook Page',
  triggerMethod: 'Manual',
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'CONFIGURED',
};

export const defaultAutomationRules: AutomationRules = {
  autoProcessSource: false,
  requireApproval: true,
  autoPublishApproved: false,
};

export const defaultSettings: Settings = {
  brandName: 'Social AutoPilot Hub',
  defaultLanguage: 'Roman Urdu / English',
  writingStyle: 'Natural Roman Urdu (Short, engaging, conversational, natural emojis)',
  defaultCategory: 'News',
  autoPublishing: false,
  requireApproval: true,
};

export const defaultSourcePosts: SourcePost[] = [];
export const defaultTriggerLogs: TriggerActivityLog[] = [];
export const defaultPosts: Post[] = [];
export const defaultActivities: ActivityLog[] = [];

export function loadStore(): DataStore {
  try {
    const readPath = getStoreReadPath();
    if (fs.existsSync(readPath)) {
      const raw = fs.readFileSync(readPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        posts: parsed.posts || defaultPosts,
        settings: { ...defaultSettings, ...(parsed.settings || {}) },
        activities: parsed.activities || defaultActivities,
        facebook: parsed.facebook,
        sourceConfig: parsed.sourceConfig || defaultSourceConfig,
        automationRules: parsed.automationRules || defaultAutomationRules,
        sourcePosts: parsed.sourcePosts || defaultSourcePosts,
        triggerLogs: parsed.triggerLogs || defaultTriggerLogs,
      };
    }
  } catch (err) {
    console.error('Error reading store file, fallback to defaults:', err);
  }
  return {
    posts: defaultPosts,
    settings: defaultSettings,
    activities: defaultActivities,
    sourceConfig: defaultSourceConfig,
    automationRules: defaultAutomationRules,
    sourcePosts: defaultSourcePosts,
    triggerLogs: defaultTriggerLogs,
  };
}

export const store = loadStore();

export function reloadStore(): DataStore {
  const loaded = loadStore();
  store.posts = loaded.posts;
  store.settings = loaded.settings;
  store.activities = loaded.activities;
  store.facebook = loaded.facebook;
  store.sourceConfig = loaded.sourceConfig;
  store.automationRules = loaded.automationRules;
  store.sourcePosts = loaded.sourcePosts;
  store.triggerLogs = loaded.triggerLogs;
  return store;
}

export function extractPostIdFromRequest(req: {
  params?: Record<string, any>;
  body?: any;
  query?: Record<string, any>;
  url?: string;
  originalUrl?: string;
  path?: string;
}): string | undefined {
  const candidates: (string | undefined)[] = [
    req.params?.id,
    req.params?.postId,
    req.params?.[0],
    (req.body && typeof req.body === 'object' ? req.body.id || req.body.postId || req.body.post?.id : undefined),
    (req.query?.id as string) || (req.query?.postId as string),
  ];

  // Try url regex patterns
  const urlToTest = req.url || req.originalUrl || req.path || '';
  const matchProcess = urlToTest.match(/\/posts\/([^\/?#]+)\/process/) || urlToTest.match(/\/gemini\/([^\/?#]+)\/process/);
  if (matchProcess && matchProcess[1]) {
    candidates.push(matchProcess[1]);
  }
  const matchPublish = urlToTest.match(/\/facebook\/publish\/([^\/?#]+)/) || urlToTest.match(/\/posts\/([^\/?#]+)\/publish/);
  if (matchPublish && matchPublish[1]) {
    candidates.push(matchPublish[1]);
  }
  const matchDirect = urlToTest.match(/\/posts\/([^\/?#]+)/) || urlToTest.match(/\/gemini\/([^\/?#]+)/);
  if (matchDirect && matchDirect[1]) {
    candidates.push(matchDirect[1]);
  }

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const decoded = decodeURIComponent(String(raw)).trim();
      if (
        decoded &&
        decoded !== ':id' &&
        decoded !== ':splat' &&
        decoded !== 'undefined' &&
        decoded !== 'null' &&
        decoded !== 'process' &&
        decoded !== 'intake'
      ) {
        return decoded;
      }
    } catch (_e) {
      const trimmed = String(raw).trim();
      if (trimmed && trimmed !== ':id' && trimmed !== ':splat') {
        return trimmed;
      }
    }
  }

  return undefined;
}

export function findPostById(idOrHint?: string): { post: Post; index: number } | null {
  if (!idOrHint) return null;
  const normalized = String(idOrHint).trim();
  if (!normalized || normalized === ':id' || normalized === ':splat' || normalized === 'undefined' || normalized === 'null') {
    return null;
  }

  // 1. Direct search in memory
  let idx = store.posts.findIndex((p) => p.id === normalized);
  if (idx !== -1) return { post: store.posts[idx], index: idx };

  // 2. Case-insensitive or trimmed search
  idx = store.posts.findIndex((p) => p.id.toLowerCase() === normalized.toLowerCase());
  if (idx !== -1) return { post: store.posts[idx], index: idx };

  // 3. Reload from disk and retry
  reloadStore();
  idx = store.posts.findIndex((p) => p.id === normalized);
  if (idx !== -1) return { post: store.posts[idx], index: idx };

  idx = store.posts.findIndex((p) => p.id.toLowerCase() === normalized.toLowerCase());
  if (idx !== -1) return { post: store.posts[idx], index: idx };

  // 4. Check if id is wrapped or sourceUrl matches
  idx = store.posts.findIndex((p) => p.id.includes(normalized) || normalized.includes(p.id));
  if (idx !== -1) return { post: store.posts[idx], index: idx };

  return null;
}

export function saveStore() {
  const serialized = JSON.stringify(store, null, 2);
  try {
    const writePath = getStoreWritePath();
    fs.writeFileSync(writePath, serialized, 'utf-8');
  } catch (err) {
    console.error('Error saving store to primary path:', err);
  }

  // Also sync to alternate path if available to ensure cross-process consistency
  try {
    if (fs.existsSync('/tmp') && getStoreWritePath() !== TMP_DATA_FILE) {
      fs.writeFileSync(TMP_DATA_FILE, serialized, 'utf-8');
    } else if (getStoreWritePath() !== DATA_FILE) {
      fs.writeFileSync(DATA_FILE, serialized, 'utf-8');
    }
  } catch (_e) {}
}

export function logActivity(type: ActivityLog['type'], description: string, postId?: string) {
  const newLog: ActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    type,
    description,
    postId,
  };
  store.activities.unshift(newLog);
  if (store.activities.length > 50) {
    store.activities = store.activities.slice(0, 50);
  }
  saveStore();
}

export const storeContext: StoreContext = {
  getPosts: () => store.posts,
  addPost: (p) => {
    store.posts.unshift(p);
    saveStore();
  },
  updatePost: (id, data) => {
    const idx = store.posts.findIndex((p) => p.id === id);
    if (idx !== -1) {
      store.posts[idx] = { ...store.posts[idx], ...data };
      saveStore();
    }
  },
  getSourcePosts: () => store.sourcePosts || [],
  addSourcePost: (sp) => {
    if (!store.sourcePosts) store.sourcePosts = [];
    store.sourcePosts.unshift(sp);
    saveStore();
  },
  updateSourcePost: (id, data) => {
    if (!store.sourcePosts) return;
    const idx = store.sourcePosts.findIndex((sp) => sp.id === id);
    if (idx !== -1) {
      store.sourcePosts[idx] = { ...store.sourcePosts[idx], ...data };
      saveStore();
    }
  },
  getTriggerLogs: () => store.triggerLogs || [],
  addTriggerLog: (log) => {
    if (!store.triggerLogs) store.triggerLogs = [];
    store.triggerLogs.unshift(log);
    if (store.triggerLogs.length > 50) store.triggerLogs = store.triggerLogs.slice(0, 50);
    saveStore();
  },
  getDefaultCategory: () => store.settings.defaultCategory || 'News',
  getWritingStyle: () => store.settings.writingStyle || '',
  getBrandName: () => store.settings.brandName || '',
  logActivity: (type, desc, postId) => logActivity(type, desc, postId),
  save: () => saveStore(),
};

export function getDestinationConfig(): DestinationConfig {
  const fbData = store.facebook;
  if (fbData && fbData.connected && fbData.selectedPage) {
    return {
      destinationId: fbData.selectedPage.id,
      pageName: fbData.selectedPage.name,
      pageId: fbData.selectedPage.id,
      connected: true,
      createdAt: fbData.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'CONNECTED',
    };
  } else if (fbData && fbData.connected) {
    return {
      destinationId: 'dest-unselected',
      pageName: 'No Page Selected',
      connected: true,
      createdAt: fbData.connectedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'CONNECTED',
    };
  }
  return {
    destinationId: 'dest-none',
    connected: false,
    status: 'NOT_CONNECTED',
  };
}
