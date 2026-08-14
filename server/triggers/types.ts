import { SourceType, TriggerType, SourcePost, Post, PostCategory } from '../../src/types.js';

export interface TriggerPayload {
  sourceUrl?: string;
  sourceName?: string;
  sourceText?: string;
  sourceType?: SourceType;
  triggerType?: TriggerType;
  category?: PostCategory;
  notes?: string;
  webhookSecret?: string;
}

export interface TriggerResult {
  success: boolean;
  message: string;
  triggerType: TriggerType;
  sourcePost?: SourcePost;
  post?: Post;
  error?: string;
  details?: string;
}

export interface TriggerProvider {
  type: TriggerType;
  name: string;
  description: string;
  getProviderStatus(): 'Active' | 'Ready' | 'Not Configured' | 'Not Available';
  getProviderNote(): string;
  process(payload: TriggerPayload): Promise<TriggerResult>;
}
