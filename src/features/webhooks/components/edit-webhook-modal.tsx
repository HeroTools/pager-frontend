import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

import { useUpdateWebhook } from '../hooks/use-webhooks';
import { type EditWebhookFormData, editWebhookSchema } from '../schemas';
import { type Webhook } from '../types';

interface EditWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  webhook: Webhook | null;
}

export function EditWebhookModal({
  open,
  onOpenChange,
  workspaceId,
  webhook,
}: EditWebhookModalProps) {
  const { data: channels } = useGetUserChannels(workspaceId);
  const updateWebhook = useUpdateWebhook(workspaceId);

  const form = useForm<EditWebhookFormData>({
    resolver: zodResolver(editWebhookSchema),
    defaultValues: {
      name: '',
      channel_id: '',
      signing_secret: '',
    },
  });

  // Update form values when webhook changes
  useEffect(() => {
    if (webhook) {
      form.reset({
        name: webhook.name,
        channel_id: webhook.channel_id || '',
        signing_secret: webhook.signing_secret || '',
      });
    }
  }, [webhook, form]);

  const handleSubmit = async (data: EditWebhookFormData) => {
    if (!webhook) return;

    const updates: any = {};

    // Only include changed fields in the update
    if (data.name !== webhook.name) {
      updates.name = data.name;
    }

    if (data.channel_id !== webhook.channel_id) {
      updates.channel_id = data.channel_id || null;
    }

    // Only include signing secret updates for custom and stripe webhooks
    if ((webhook.source_type === 'custom' || webhook.source_type === 'stripe') && data.signing_secret !== webhook.signing_secret) {
      updates.signing_secret = data.signing_secret || null;
    }

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      await updateWebhook.mutateAsync({
        webhookId: webhook.id,
        data: updates,
      });
      onOpenChange(false);
      toast.success('Webhook updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update webhook');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  if (!webhook) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
          <DialogDescription>Update webhook settings.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {webhook.source_type !== 'custom' && (
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
            )}

            {(webhook.source_type === 'custom' || webhook.source_type === 'stripe') && (
              <FormField
                control={form.control}
                name="signing_secret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Signing Secret
                      {webhook.source_type === 'stripe' && (
                        <span className="text-xs text-muted-foreground ml-1">
                          (get from Stripe after adding webhook URL)
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder={webhook.source_type === 'stripe' ? 'whsec_...' : 'Signing secret'}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateWebhook.isPending}>
                {updateWebhook.isPending ? 'Updating...' : 'Update Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}