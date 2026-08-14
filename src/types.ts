export type PostCategory = 'Funny' | 'Fact' | 'News' | 'Opinion' | 'General';

export type PostStatus = 'New' | 'Processing' | 'Ready' | 'Approved' | 'Published' | 'Rejected' | 'Failed';

export interface AiAnalysis {
  topic: string;
  summary: string;
  keyFacts: string[];
  importantClaims?: string[];
  whyInteresting: string;
  detectedType: PostCategory;
}

export interface Post {
  id: string;
  sourceUrl: string;
  originalText: string;
  sourceName: string;
  category: PostCategory;
  status: PostStatus;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  processedAt?: string;
  approvedAt?: string;
  aiAnalysis?: AiAnalysis;
  aiRewrite?: string;
  headline?: string;
  hashtags?: string[] | string;
  summary?: string;
  keyFacts?: string[] | string;
  importantClaims?: string[] | string;
  emojis?: string;
  error?: string;
  sourceAttribution?: string;
  verificationStatus?: 'Confirmed' | 'Needs Verification';
  imageUrl?: string;
  facebookStatus?: 'NOT_PUBLISHED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  facebookPostId?: string;
  facebookPostUrl?: string;
  publishedAt?: string;
  publishError?: string;
}

export interface Settings {
  brandName: string;
  defaultLanguage: string;
  writingStyle: string;
  defaultCategory: PostCategory;
  autoPublishing: boolean;
  requireApproval: boolean;
}

export interface AutomationStatus {
  facebookConnection: 'Not Connected' | 'Connected' | 'Page Not Selected';
  geminiAI: 'Not Connected' | 'Connected' | 'Ready for Phase 2' | 'Not Configured';
  aiProvider?: string;
  publishingAutomation: 'Not Configured' | 'Active' | 'Paused';
  scheduledAutomation: 'Not Configured' | 'Active' | 'Paused';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  type: 'post_added' | 'status_changed' | 'settings_updated' | 'post_deleted' | 'post_edited' | 'post_processed' | 'facebook_connected' | 'facebook_disconnected' | 'page_selected' | 'post_published' | 'publish_failed';
  description: string;
  postId?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  picture?: string;
  accessToken?: string;
}

export interface FacebookStatus {
  configured: boolean;
  hasAppId?: boolean;
  hasAppSecret?: boolean;
  hasRedirectUri?: boolean;
  connected: boolean;
  connectedAt?: string;
  user?: {
    id: string;
    name: string;
  };
  availablePages?: Array<{
    id: string;
    name: string;
    category?: string;
    picture?: string;
  }>;
  selectedPage?: {
    id: string;
    name: string;
    category?: string;
    picture?: string;
  };
  publishingStatus: 'Not Configured' | 'Active';
  error?: string;
}

export type SourceType = 'Facebook Page' | 'Facebook Profile' | 'Public Source';
export type TriggerMethod = 'Like' | 'Share' | 'Manual' | 'Other';
export type SourceStatus = 'NOT_CONFIGURED' | 'CONFIGURED' | 'ACTIVE' | 'DISABLED' | 'ERROR';
export type TriggerType = 'MANUAL' | 'URL' | 'SHARE' | 'WEBHOOK' | 'LIKE';

export interface SourceConfig {
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  sourceType: SourceType;
  triggerMethod: TriggerMethod;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
  status: SourceStatus;
}

export type DestinationStatus = 'NOT_CONNECTED' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';

export interface DestinationConfig {
  destinationId: string;
  pageName?: string;
  pageId?: string;
  connected: boolean;
  createdAt?: string;
  updatedAt?: string;
  status: DestinationStatus;
}

export interface AutomationRules {
  autoProcessSource: boolean;
  requireApproval: boolean;
  autoPublishApproved: boolean;
}

export interface TriggerPayload {
  sourceUrl?: string;
  sourceName?: string;
  sourceText?: string;
  sourceType?: SourceType;
  triggerType?: TriggerType;
  category?: PostCategory;
  notes?: string;
  imageUrl?: string;
  webhookSecret?: string;
}

export interface TriggerActivityLog {
  id: string;
  timestamp: string;
  trigger: TriggerType;
  source: string;
  status: 'Received' | 'Processed' | 'Failed' | 'Ignored' | 'Duplicate';
  details?: string;
}

export interface SourcePost {
  id: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: SourceType;
  sourceText: string;
  triggerType: TriggerType;
  receivedAt: string;
  status: 'NEW' | 'PROCESSED' | 'FAILED';
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriggerProviderInfo {
  name: string;
  type: TriggerType;
  status: 'Active' | 'Ready' | 'Not Configured' | 'Not Available';
  description: string;
  note?: string;
}

export interface DashboardStats {
  totalProcessed: number;
  waitingForApproval: number;
  published: number;
  totalApproved: number;
  publishedToFacebook: number;
  failedPublications: number;
  automationStatus: string;
  lastProcessedPost: Post | null;
  sourceConfig?: SourceConfig;
  destinationConfig?: DestinationConfig;
  automationRules?: AutomationRules;
  triggerLogs?: TriggerActivityLog[];
  triggerProviders?: TriggerProviderInfo[];
}
