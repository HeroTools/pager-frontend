import { zodResolver } from '@hookform/resolvers/zod';
import { Webhook } from 'lucide-react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';

import { useCreateWebhook } from '../hooks/use-webhooks';
import { type CreateWebhookFormData, createWebhookSchema } from '../schemas';
import { type Webhook as WebhookType } from '../types';

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

const ServiceIcon = ({ type, className = 'w-6 h-6' }: { type: string; className?: string }) => {
  const iconMap = {
    custom: <Webhook className={className} />,
    github: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
    linear: (
      <svg className={className} viewBox="0 0 100 100" fill="currentColor">
        <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z" />
      </svg>
    ),
    jira: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84A.84.84 0 0 0 21.16 2H11.53zM6.77 6.8c0 2.4 1.94 4.34 4.34 4.34h1.8v1.72c0 2.38 1.96 4.34 4.34 4.34V7.63a.84.84 0 0 0-.83-.83H6.77zM2 11.6c0 2.4 1.95 4.34 4.35 4.34h1.78v1.72c0 2.4 1.94 4.34 4.34 4.34v-9.57a.83.83 0 0 0-.83-.83H2z" />
      </svg>
    ),
    stripe: (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
      </svg>
    ),
  };

  return iconMap[type as keyof typeof iconMap] || iconMap.custom;
};

interface CreateWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  webhooks: WebhookType[];
  onWebhookCreated: (webhook: WebhookType) => void;
}

export function CreateWebhookModal({
  open,
  onOpenChange,
  workspaceId,
  webhooks,
  onWebhookCreated,
}: CreateWebhookModalProps) {
  const { data: channels } = useGetUserChannels(workspaceId);
  const createWebhook = useCreateWebhook(workspaceId);

  const form = useForm<CreateWebhookFormData>({
    resolver: zodResolver(createWebhookSchema),
    defaultValues: {
      name: '',
      source_type: 'custom',
      channel_id: '',
      signing_secret: '',
    },
  });

  const selectedSourceType = form.watch('source_type');
  const sourceTypeInfo = SOURCE_TYPE_INFO[selectedSourceType];

  const getWebhookCounts = () => {
    return webhooks.reduce(
      (acc, webhook) => {
        acc[webhook.source_type] = (acc[webhook.source_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  };

  const canCreateWebhook = (sourceType: string) => {
    const counts = getWebhookCounts();
    const info = SOURCE_TYPE_INFO[sourceType as keyof typeof SOURCE_TYPE_INFO];
    return (counts[sourceType] || 0) < info.maxAllowed;
  };

  const getSigningSecretPlaceholder = (sourceType: string) => {
    switch (sourceType) {
      case 'stripe':
        return 'whsec_... (optional - can be added after webhook creation)';
      case 'github':
        return 'GitHub webhook secret';
      case 'linear':
        return 'Linear webhook secret';
      case 'jira':
        return 'Jira webhook secret';
      default:
        return 'Enter the signing secret provided by the service';
    }
  };

  const handleSubmit: SubmitHandler<CreateWebhookFormData> = async (data) => {
    try {
      const newWebhook = await createWebhook.mutateAsync({
        workspace_id: workspaceId,
        name: data.name,
        source_type: data.source_type,
        channel_id: sourceTypeInfo.requiresChannel ? data.channel_id : undefined,
        signing_secret: sourceTypeInfo.requiresChannel ? data.signing_secret : undefined,
      });

      onWebhookCreated(newWebhook);
      onOpenChange(false);
      form.reset();
      toast.success('Webhook created successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create webhook');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Webhook</DialogTitle>
          <DialogDescription>
            Choose the type of webhook and configure its settings.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="source_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-auto py-3">
                        <SelectValue placeholder="Select webhook type">
                          {selectedSourceType && (
                            <div className="flex items-center gap-3">
                              <ServiceIcon
                                type={selectedSourceType}
                                className="w-5 h-5 flex-shrink-0"
                              />
                              <span className="font-medium">
                                {SOURCE_TYPE_INFO[selectedSourceType].label}
                              </span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(SOURCE_TYPE_INFO).map(([key, info]) => (
                        <SelectItem
                          key={key}
                          value={key}
                          disabled={!canCreateWebhook(key)}
                          className="py-2"
                        >
                          <div className="flex items-center gap-3">
                            <ServiceIcon type={key} className="w-5 h-5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{info.label}</div>
                              <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {info.description}
                                {!canCreateWebhook(key) && ' (Limit reached)'}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CI/CD Notifications, Support Alerts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {sourceTypeInfo.requiresChannel && (
              <>
                <FormField
                  control={form.control}
                  name="channel_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Channel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a channel" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {channels?.map((channel) => (
                            <SelectItem key={channel.id} value={channel.id}>
                              #{channel.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signing_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Signing Secret
                        <span className="text-xs text-muted-foreground ml-1">
                          {selectedSourceType === 'stripe'
                            ? '(optional - add after creating webhook in Stripe)'
                            : `(from your ${sourceTypeInfo.label} webhook settings)`}
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={getSigningSecretPlaceholder(selectedSourceType)}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {selectedSourceType === 'stripe' && (
                        <div className="mt-2 p-3 rounded-md border bg-card text-card-foreground border-border">
                          <div className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded-full bg-text-warning/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <div className="w-2 h-2 rounded-full bg-text-warning"></div>
                            </div>
                            <div className="text-xs space-y-1">
                              <p className="font-medium text-text-warning">Setup Instructions</p>
                              <p className="text-muted-foreground">
                                Create the webhook first, then add the URL to Stripe to get your
                                signing secret.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWebhook.isPending}>
                {createWebhook.isPending ? 'Creating...' : 'Create Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
