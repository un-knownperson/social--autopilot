import { TriggerProvider, TriggerPayload, TriggerResult } from './types.js';
import { ContentProcessor } from './ContentProcessor.js';

export class WebhookTrigger implements TriggerProvider {
  public type = 'WEBHOOK' as const;
  public name = 'API / Webhook Trigger';
  public description = 'Automated HTTP POST endpoint with secret header / signature verification architecture.';

  private processor: ContentProcessor;

  constructor(processor: ContentProcessor) {
    this.processor = processor;
  }

  public getProviderStatus(): 'Active' | 'Ready' | 'Not Configured' | 'Not Available' {
    const configuredSecret = process.env.WEBHOOK_SECRET;
    return configuredSecret && configuredSecret.trim() ? 'Active' : 'Not Configured';
  }

  public getProviderNote(): string {
    const configuredSecret = process.env.WEBHOOK_SECRET;
    if (configuredSecret && configuredSecret.trim()) {
      return 'Webhook secret configured in environment. Endpoint protected.';
    }
    return 'Not Configured. Add WEBHOOK_SECRET in environment to protect intake endpoint.';
  }

  public async process(payload: TriggerPayload): Promise<TriggerResult> {
    const configuredSecret = process.env.WEBHOOK_SECRET;

    // Security Check: If WEBHOOK_SECRET is set, verify incoming token
    if (configuredSecret && configuredSecret.trim()) {
      const incomingSecret = (payload.webhookSecret || '').trim();
      if (incomingSecret !== configuredSecret.trim()) {
        return {
          success: false,
          message: 'Webhook authentication failed: Invalid or missing security token.',
          triggerType: this.type,
          error: 'Unauthorized webhook request.',
          details: 'Provide x-webhook-secret header or webhookSecret in payload matching WEBHOOK_SECRET env var.',
        };
      }
    }

    if (!payload.sourceUrl && !payload.sourceText) {
      return {
        success: false,
        message: 'Webhook request requires either sourceUrl or sourceText in request body.',
        triggerType: this.type,
        error: 'Invalid webhook payload structure.',
      };
    }

    return this.processor.processIntake(
      {
        ...payload,
        sourceName: payload.sourceName || 'Incoming Webhook Event',
      },
      this.type
    );
  }
}
