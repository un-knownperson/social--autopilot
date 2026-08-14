import { TriggerProvider, TriggerPayload, TriggerResult } from './types.js';
import { ContentProcessor } from './ContentProcessor.js';

export class UrlTrigger implements TriggerProvider {
  public type = 'URL' as const;
  public name = 'Manual URL Trigger';
  public description = 'Public post URL submission with instant link analysis and queue routing.';

  private processor: ContentProcessor;

  constructor(processor: ContentProcessor) {
    this.processor = processor;
  }

  public getProviderStatus(): 'Active' | 'Ready' | 'Not Configured' | 'Not Available' {
    return 'Active';
  }

  public getProviderNote(): string {
    return 'Active and ready for URL-based source post submissions.';
  }

  public async process(payload: TriggerPayload): Promise<TriggerResult> {
    const rawUrl = (payload.sourceUrl || '').trim();
    if (!rawUrl) {
      return {
        success: false,
        message: 'Manual URL trigger requires a valid source URL.',
        triggerType: this.type,
        error: 'Missing source URL.',
      };
    }

    return this.processor.processIntake(
      {
        ...payload,
        sourceUrl: rawUrl,
      },
      this.type
    );
  }
}
