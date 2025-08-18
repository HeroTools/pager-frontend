import { Card } from '@/components/ui/card';

import { ServiceIcon } from './service-icons';

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
} as const;

interface WebhookLimitsInfoProps {
  webhookCounts: Record<string, number>;
}

export function WebhookLimitsInfo({ webhookCounts }: WebhookLimitsInfoProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {Object.entries(SOURCE_TYPE_INFO).map(([key, info]) => (
        <Card key={key} className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <ServiceIcon type={key} className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-sm">{info.label}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {webhookCounts[key] || 0} / {info.maxAllowed}
          </div>
        </Card>
      ))}
    </div>
  );
}

export { SOURCE_TYPE_INFO };
