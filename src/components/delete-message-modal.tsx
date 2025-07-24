import type { FC } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteMessageModal: FC<DeleteMessageModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogTitle>Delete message?</DialogTitle>
      <p className="text-sm text-muted-foreground mt-2">
        This message will be deleted immediately. You can&apos;t undo this action.
      </p>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
