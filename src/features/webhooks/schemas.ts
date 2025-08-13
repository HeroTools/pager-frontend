import * as z from 'zod';

import { type WebhookSourceType } from './types';

const webhookSourceTypes = ['custom', 'github', 'linear', 'jira', 'stripe'] as const;

export const createWebhookSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Webhook name is required')
      .max(50, 'Webhook name must be 50 characters or less'),
    source_type: z.enum(webhookSourceTypes),
    channel_id: z.string().optional(),
    signing_secret: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const sourceTypeInfo = getSourceTypeInfo(data.source_type);

    if (sourceTypeInfo.requiresChannel && !data.channel_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please select a channel for this webhook type',
        path: ['channel_id'],
      });
    }

    // Require signing secret for specific services (not Stripe or Custom)
    if ((data.source_type === 'github' || data.source_type === 'linear' || data.source_type === 'jira') && !data.signing_secret?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please enter the signing secret provided by the service',
        path: ['signing_secret'],
      });
    }

    if (
      data.source_type === 'stripe' &&
      data.signing_secret &&
      !data.signing_secret.startsWith('whsec_')
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Stripe signing secret must start with "whsec_"',
        path: ['signing_secret'],
      });
    }
  });

export const editWebhookSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Webhook name is required')
    .max(50, 'Webhook name must be 50 characters or less'),
  channel_id: z.string().optional(),
  signing_secret: z.string().optional(),
});

export type CreateWebhookFormData = z.infer<typeof createWebhookSchema>;
export type EditWebhookFormData = z.infer<typeof editWebhookSchema>;

const sourceTypeInfoSchema = z.object({
  label: z.string(),
  description: z.string(),
  maxAllowed: z.number(),
  requiresChannel: z.boolean(),
});

function getSourceTypeInfo(sourceType: WebhookSourceType) {
  const SOURCE_TYPE_INFO = {
    custom: {
      label: 'Custom',
      description: 'General purpose webhooks for custom integrations',
      maxAllowed: 5,
      requiresChannel: false,
    },
    github: {
      label: 'GitHub',
      description: 'GitHub repository events and notifications',
      maxAllowed: 5,
      requiresChannel: true,
    },
    linear: {
      label: 'Linear',
      description: 'Linear issue tracking and project updates',
      maxAllowed: 5,
      requiresChannel: true,
    },
    jira: {
      label: 'Jira',
      description: 'Jira issue tracking and project management',
      maxAllowed: 5,
      requiresChannel: true,
    },
    stripe: {
      label: 'Stripe',
      description: 'Stripe payment events and subscription updates',
      maxAllowed: 5,
      requiresChannel: true,
    },
  } as const satisfies Record<WebhookSourceType, z.infer<typeof sourceTypeInfoSchema>>;

  return SOURCE_TYPE_INFO[sourceType];
}
