import { Copy, Eye, EyeOff, Info } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useUpdateWebhook } from '../hooks/use-webhooks';
import { type Webhook } from '../types';

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

interface WebhookDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook: Webhook | null;
  workspaceId: string;
}

export function WebhookDetailsModal({
  open,
  onOpenChange,
  webhook,
  workspaceId,
}: WebhookDetailsModalProps) {
  const [showSecret, setShowSecret] = useState(false);
  const [secretValue, setSecretValue] = useState('');

  const updateWebhook = useUpdateWebhook(workspaceId);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSaveSecret = async () => {
    if (!webhook) return;

    // Validate Stripe secret format
    if (webhook.source_type === 'stripe' && secretValue && !secretValue.startsWith('whsec_')) {
      toast.error('Stripe signing secret must start with "whsec_"');
      return;
    }

    try {
      await updateWebhook.mutateAsync({
        webhookId: webhook.id,
        data: { signing_secret: secretValue || null },
      });

      toast.success('Signing secret updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update signing secret');
    }
  };

  const getExamplePayload = (sourceType: string) => {
    if (sourceType === 'custom') {
      return `{
  "channel_id": "your-channel-id",
  "text": "Hello from webhook!",
  "username": "My Bot",
  "icon_url": "https://example.com/avatar.png"
}`;
    }
    return `// Configure this URL in your ${SOURCE_TYPE_INFO[sourceType as keyof typeof SOURCE_TYPE_INFO]?.label} webhook settings
// Events will automatically be posted to the configured channel`;
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSecretValue('');
    }
    onOpenChange(open);
  };

  if (!webhook) return null;

  const sourceTypeInfo = SOURCE_TYPE_INFO[webhook.source_type];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Webhook Details</DialogTitle>
          <DialogDescription>
            Use these credentials to configure your external application.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input value={webhook.url} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhook.url, 'Webhook URL')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {webhook.signing_secret && (
            <div>
              <Label>Signing Secret</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={webhook.signing_secret}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={() => setShowSecret(!showSecret)}>
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhook.signing_secret || '', 'Signing Secret')}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {webhook.source_type === 'stripe' && !webhook.signing_secret && (
            <div>
              <Label>
                Add Signing Secret
                <span className="text-xs text-muted-foreground ml-1">
                  (get from Stripe after adding webhook URL)
                </span>
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="password"
                  value={secretValue}
                  onChange={(e) => setSecretValue(e.target.value)}
                  placeholder="whsec_..."
                  className="font-mono text-sm"
                />
                <Button
                  onClick={handleSaveSecret}
                  disabled={updateWebhook.isPending || !secretValue.trim()}
                >
                  {updateWebhook.isPending ? 'Saving...' : 'Save Secret'}
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label>Example Usage</Label>
            <Textarea
              readOnly
              className="mt-1 font-mono text-sm"
              rows={webhook.source_type === 'custom' ? 8 : 4}
              value={
                webhook.source_type === 'custom'
                  ? `curl -X POST "${webhook.url}" \\
  -H "Content-Type: application/json" \\
  -d '${getExamplePayload(webhook.source_type)}'`
                  : getExamplePayload(webhook.source_type)
              }
            />
          </div>

          {webhook.source_type === 'custom' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Custom webhooks require a <code>channel_id</code> in each request. You can find
                channel IDs in the URL when viewing a channel.
              </AlertDescription>
            </Alert>
          )}

          {webhook.source_type === 'stripe' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {!webhook.signing_secret ? (
                  <>
                    <strong>Next steps:</strong> Copy the webhook URL above and add it to your
                    Stripe Dashboard under Developers → Webhooks. After creating the webhook in
                    Stripe, copy the signing secret and paste it in the field above.
                  </>
                ) : (
                  <>
                    This webhook is configured and ready to receive Stripe events. Make sure
                    you&apos;ve selected the appropriate events in your Stripe Dashboard.
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}

          {webhook.source_type === 'github' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Add this webhook URL to your GitHub repository settings under Webhooks. Don&apos;t
                forget to set the signing secret and select the events you want to receive.
              </AlertDescription>
            </Alert>
          )}

          {webhook.source_type === 'linear' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configure this webhook in your Linear workspace settings under API → Webhooks. Set
                the webhook URL and signing secret to start receiving Linear events.
              </AlertDescription>
            </Alert>
          )}

          {webhook.source_type === 'jira' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Set up this webhook in your Jira project settings under System → WebHooks. Configure
                the URL and events to receive Jira notifications.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
