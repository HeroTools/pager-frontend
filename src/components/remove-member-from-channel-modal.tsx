import { FC } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';

interface RemoveConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channelName: string;
  memberName: string;
  isPrivate: boolean;
}

const RemoveConfirmation: FC<RemoveConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  channelName,
  memberName,
  isPrivate,
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogTitle>
        Remove {memberName} from #{channelName}?
      </DialogTitle>
      <p className="text-sm text-muted-foreground mt-2">
        {!isPrivate
          ? "They'll still be able to rejoin, or be added to the conversation."
          : "They won't be able to rejoin unless they are invited by someone in this channel."}
      </p>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Remove
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default RemoveConfirmation;
