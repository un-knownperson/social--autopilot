import {
  Post,
  Settings,
  ActivityLog,
  DashboardStats,
  AutomationStatus,
  FacebookStatus,
  SourceConfig,
  AutomationRules,
  TriggerProviderInfo,
  TriggerActivityLog,
  SourcePost,
  TriggerPayload,
} from '../types';

export async function fetchStats(): Promise<{ stats: DashboardStats & { recentActivities: ActivityLog[] } }> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return res.json();
}

export async function fetchPosts(): Promise<{ posts: Post[] }> {
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}

export async function fetchPostById(id: string): Promise<{ post: Post }> {
  const res = await fetch(`/api/posts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch post');
  return res.json();
}

export class DuplicatePostError extends Error {
  existingPost: Post;
  constructor(message: string, existingPost: Post) {
    super(message);
    this.name = 'DuplicatePostError';
    this.existingPost = existingPost;
  }
}

export async function createPost(data: {
  sourceUrl?: string;
  originalText: string;
  sourceName?: string;
  category?: string;
  notes?: string;
  imageUrl?: string;
  triggerType?: string;
}): Promise<{ message: string; post: Post }> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to process post');
  }
  return res.json();
}

export interface ExtractedUrlPreview {
  success: boolean;
  url: string;
  title?: string;
  description?: string;
  text?: string;
  imageUrl?: string;
  sourceName?: string;
  isDirectImage?: boolean;
  error?: string;
}

export async function extractUrlPreview(url: string): Promise<ExtractedUrlPreview> {
  const res = await fetch('/api/extract-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to extract content from URL');
  }
  return data;
}

export interface ImageAiEditResult {
  success: boolean;
  editedImageUrl?: string;
  originalImageUrl: string;
  prompt: string;
  error?: string;
  details?: string;
  provider?: string;
  model?: string;
}

export async function editImageWithAI(params: {
  imageUrl: string;
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  postId?: string;
}): Promise<ImageAiEditResult> {
  const res = await fetch('/api/ai/edit-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.details || 'Failed to edit image with AI');
  }
  return data;
}

export async function fetchImageAIStatus(): Promise<{
  available: boolean;
  provider: string;
  model: string;
  note: string;
}> {
  const res = await fetch('/api/ai/image-status');
  if (!res.ok) throw new Error('Failed to fetch AI image editing status');
  return res.json();
}

export async function updatePost(
  id: string,
  data: Partial<Post>
): Promise<{ message: string; post: Post }> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update post');
  }
  return res.json();
}

export async function deletePost(id: string): Promise<{ message: string; id: string }> {
  const res = await fetch(`/api/posts/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete post');
  return res.json();
}

export async function fetchSettings(): Promise<{ settings: Settings }> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: Partial<Settings>): Promise<{ message: string; settings: Settings }> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update settings');
  }
  return res.json();
}

export async function processPostWithAI(id: string, postData?: Partial<Post>): Promise<{ message: string; post: Post }> {
  const res = await fetch(`/api/posts/${encodeURIComponent(id)}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, post: postData }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'AI processing failed');
  }
  return data;
}

// Retain backward-compatible alias
export const processPostWithGemini = processPostWithAI;

export async function fetchStatus(): Promise<{ status: AutomationStatus }> {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchFacebookStatus(): Promise<FacebookStatus> {
  const res = await fetch('/api/facebook/status');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch Facebook status');
  }
  return res.json();
}

export async function getFacebookLoginUrl(): Promise<{ configured: boolean; url?: string; error?: string }> {
  const res = await fetch('/api/facebook/login');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Facebook integration is not configured yet. Add FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and FACEBOOK_REDIRECT_URI in the deployment environment.');
  }
  return data;
}

export async function selectFacebookPage(pageId: string): Promise<FacebookStatus> {
  const res = await fetch('/api/facebook/select-page', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pageId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to select Facebook page');
  }
  return data;
}

export async function disconnectFacebook(): Promise<FacebookStatus> {
  const res = await fetch('/api/facebook/disconnect', {
    method: 'POST',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to disconnect Facebook');
  }
  return data;
}

export interface EnvStatus {
  openrouter?: { configured: boolean; status: string; model?: string };
  gemini: { configured: boolean; status: string };
  facebookAppId: { configured: boolean; status: string };
  facebookAppSecret: { configured: boolean; status: string };
  facebookRedirectUri: { configured: boolean; status: string; effectiveUri: string };
  overallConfigured: boolean;
  deploymentEnvironment: string;
}

export async function fetchSourceConfig(): Promise<{ source: SourceConfig }> {
  const res = await fetch('/api/source');
  if (!res.ok) throw new Error('Failed to fetch source configuration');
  return res.json();
}

export async function updateSourceConfig(data: Partial<SourceConfig>): Promise<{ message: string; source: SourceConfig }> {
  const res = await fetch('/api/source', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update source configuration');
  }
  return res.json();
}

export async function testSourceConfig(data: { sourceName?: string; sourceUrl: string; sourceType?: string; triggerMethod?: string }): Promise<{ valid: boolean; message: string }> {
  const res = await fetch('/api/source/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const resData = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resData.error || 'Source test failed');
  }
  return resData;
}

export async function fetchAutomationRules(): Promise<{ rules: AutomationRules }> {
  const res = await fetch('/api/automation-rules');
  if (!res.ok) throw new Error('Failed to fetch automation rules');
  return res.json();
}

export async function updateAutomationRules(data: Partial<AutomationRules>): Promise<{ message: string; rules: AutomationRules }> {
  const res = await fetch('/api/automation-rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update automation rules');
  }
  return res.json();
}

export async function fetchEnvStatus(): Promise<EnvStatus> {
  const res = await fetch('/api/env-status');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch environment configuration status');
  }
  return res.json();
}

export async function fetchTriggerProviders(): Promise<{ providers: TriggerProviderInfo[] }> {
  const res = await fetch('/api/triggers/providers');
  if (!res.ok) throw new Error('Failed to fetch trigger providers');
  return res.json();
}

export async function fetchTriggerLogs(): Promise<{ logs: TriggerActivityLog[] }> {
  const res = await fetch('/api/triggers/logs');
  if (!res.ok) throw new Error('Failed to fetch trigger logs');
  return res.json();
}

export async function fetchSourcePosts(): Promise<{ sourcePosts: SourcePost[] }> {
  const res = await fetch('/api/source-posts');
  if (!res.ok) throw new Error('Failed to fetch source posts');
  return res.json();
}

export async function postSourceIntake(data: Partial<TriggerPayload>): Promise<{ success: boolean; message: string; sourcePost?: SourcePost; post?: Post }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data.webhookSecret) {
    headers['x-webhook-secret'] = data.webhookSecret;
  }

  const res = await fetch('/api/source/intake', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  const resData = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(resData.error || resData.message || 'Failed to process source intake');
  }

  return resData;
}

export async function publishPostToFacebook(postId: string, postData?: Partial<Post>): Promise<{ message: string; post: Post }> {
  const res = await fetch('/api/facebook/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ postId, id: postId, post: postData }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to publish post to Facebook Page.');
  }
  return data;
}
