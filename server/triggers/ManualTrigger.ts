import { TriggerProvider, TriggerPayload, TriggerResult } from './types.js';
import { ContentProcessor } from './ContentProcessor.js';

export class ManualTrigger implements TriggerProvider {
  public type = 'MANUAL' as const;
  public name = 'Manual Text Trigger';
  public description = 'Direct text or article snippet submission via application dashboard or form.';

  private processor: ContentProcessor;

  constructor(processor: ContentProcessor) {
    this.processor = processor;
  }

  public getProviderStatus(): 'Active' | 'Ready' | 'Not Configured' | 'Not Available' {
    return 'Active';
  }

  public getProviderNote(): string {
    return 'Active and ready for text-based source post submissions.';
  }

  public async process(payload: TriggerPayload): Promise<TriggerResult> {
    const rawText = (payload.sourceText || '').trim();
    if (!rawText) {
      return {
        success: false,
        message: 'Manual Text trigger requires non-empty source text.',
        triggerType: this.type,
        error: 'Missing source text.',
      };
    }

    return this.processor.processIntake(
      {
        ...payload,
        sourceText: rawText,
        sourceName: payload.sourceName || 'Manual Text Entry',
      },
      this.type
    );
  }
}
