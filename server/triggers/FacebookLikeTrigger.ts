import { TriggerProvider, TriggerPayload, TriggerResult } from './types.js';

export class FacebookLikeTrigger implements TriggerProvider {
  public type = 'LIKE' as const;
  public name = 'Facebook Like Trigger';
  public description = 'Placeholder for official Meta Graph API Like webhook integration.';

  public getProviderStatus(): 'Active' | 'Ready' | 'Not Configured' | 'Not Available' {
    return 'Not Available';
  }

  public getProviderNote(): string {
    return 'Facebook Like trigger is not configured. Unsupported by standard Meta Graph API without specialized app review permissions; scraping and browser automation are disabled.';
  }

  public async process(_payload: TriggerPayload): Promise<TriggerResult> {
    return {
      success: false,
      message: 'Facebook Like trigger is not configured.',
      triggerType: this.type,
      error: 'Facebook Like trigger is not configured.',
      details: 'Meta Graph API does not expose personal like stream webhooks in standard tier.',
    };
  }
}
