'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChannelEntity } from '@/features/channels';

interface LeaveChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelEntity | null;
  onConfirm: () => void;
  isLeaving: boolean;
}

export function LeaveChannelModal({
  open,
  onOpenChange,
  channel,
  onConfirm,
  isLeaving,
}: LeaveChannelModalProps) {
  if (!channel) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave Channel</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave the private channel &quot;{channel.name}&quot;? You will
            need to be invited back to rejoin. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLeaving}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLeaving}>
            {isLeaving ? 'Leaving...' : 'Leave Channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
