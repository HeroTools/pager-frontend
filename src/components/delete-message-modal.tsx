import { FC } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

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
        This message will be deleted immediately. You can't undo this action.
      </p>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
