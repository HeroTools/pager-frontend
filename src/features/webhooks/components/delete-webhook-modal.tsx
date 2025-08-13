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

import { useDeleteWebhook } from '../hooks/use-webhooks';
import { type Webhook } from '../types';

interface DeleteWebhookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  webhook: Webhook | null;
}

export function DeleteWebhookModal({
  open,
  onOpenChange,
  workspaceId,
  webhook,
}: DeleteWebhookModalProps) {
  const deleteWebhook = useDeleteWebhook(workspaceId);

  const handleDelete = async () => {
    if (!webhook) return;

    try {
      await deleteWebhook.mutateAsync(webhook.id);
      onOpenChange(false);
      toast.success('Webhook deleted successfully');
    } catch (error) {
      toast.error('Failed to delete webhook');
    }
  };

  if (!webhook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Webhook</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{webhook.name}&quot;? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteWebhook.isPending}>
            {deleteWebhook.isPending ? 'Deleting...' : 'Delete Webhook'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
