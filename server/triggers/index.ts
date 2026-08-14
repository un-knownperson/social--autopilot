import { TriggerProviderInfo, TriggerType } from '../../src/types.js';
import { ContentProcessor, StoreContext } from './ContentProcessor.js';
import { TriggerProvider, TriggerPayload, TriggerResult } from './types.js';
import { ManualTrigger } from './ManualTrigger.js';
import { UrlTrigger } from './UrlTrigger.js';
import { ShareTrigger } from './ShareTrigger.js';
import { WebhookTrigger } from './WebhookTrigger.js';
import { FacebookLikeTrigger } from './FacebookLikeTrigger.js';

export * from './types.js';
export * from './ContentProcessor.js';

export class TriggerManager {
  private processor: ContentProcessor;
  private providers: Map<TriggerType, TriggerProvider> = new Map();

  constructor(store: StoreContext) {
    this.processor = new ContentProcessor(store);

    const manual = new ManualTrigger(this.processor);
    const url = new UrlTrigger(this.processor);
    const share = new ShareTrigger(this.processor);
    const webhook = new WebhookTrigger(this.processor);
    const like = new FacebookLikeTrigger();

    this.providers.set('MANUAL', manual);
    this.providers.set('URL', url);
    this.providers.set('SHARE', share);
    this.providers.set('WEBHOOK', webhook);
    this.providers.set('LIKE', like);
  }

  public async processTrigger(payload: TriggerPayload): Promise<TriggerResult> {
    let resolvedType: TriggerType = payload.triggerType || 'MANUAL';

    if (!payload.triggerType) {
      if (payload.webhookSecret) {
        resolvedType = 'WEBHOOK';
      } else if (payload.sourceUrl && !payload.sourceText) {
        resolvedType = 'URL';
      } else if (payload.sourceText && !payload.sourceUrl) {
        resolvedType = 'MANUAL';
      } else if (payload.sourceUrl && payload.sourceText) {
        resolvedType = 'SHARE';
      }
    }

    const provider = this.providers.get(resolvedType);
    if (!provider) {
      return {
        success: false,
        message: `Unknown or unsupported trigger type "${resolvedType}".`,
        triggerType: resolvedType,
        error: 'Unsupported trigger type.',
      };
    }

    return provider.process(payload);
  }

  public getProvidersInfo(): TriggerProviderInfo[] {
    return Array.from(this.providers.values()).map((provider) => ({
      name: provider.name,
      type: provider.type,
      status: provider.getProviderStatus(),
      description: provider.description,
      note: provider.getProviderNote(),
    }));
  }
}
