import { TriggerProvider, TriggerPayload, TriggerResult } from './types.js';
import { ContentProcessor } from './ContentProcessor.js';

export class ShareTrigger implements TriggerProvider {
  public type = 'SHARE' as const;
  public name = 'Share-to-App Trigger';
  public description = 'Incoming share link or text payload sent via /api/source/intake mobile/browser share sheets.';

  private processor: ContentProcessor;

  constructor(processor: ContentProcessor) {
    this.processor = processor;
  }

  public getProviderStatus(): 'Active' | 'Ready' | 'Not Configured' | 'Not Available' {
    return 'Ready';
  }

  public getProviderNote(): string {
    return 'Ready to receive POST intake requests from share extensions or bookmarklets.';
  }

  public async process(payload: TriggerPayload): Promise<TriggerResult> {
    if (!payload.sourceUrl && !payload.sourceText) {
      return {
        success: false,
        message: 'Share-to-App intake request requires either sourceUrl or sourceText in request body.',
        triggerType: this.type,
        error: 'Missing shared content.',
      };
    }

    return this.processor.processIntake(
      {
        ...payload,
        sourceName: payload.sourceName || 'Shared Source Content',
      },
      this.type
    );
  }
}
