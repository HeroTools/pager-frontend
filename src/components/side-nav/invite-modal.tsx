import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useParamIds } from "@/hooks/use-param-ids";
import { useEffect } from "react";
import { useInviteLink } from "@/features/auth/hooks/use-auth-mutations";

interface InviteModalProps {
  open: boolean;
  name: string;
  setOpen: (open: boolean) => void;
}

export const InviteModal = ({ open, name, setOpen }: InviteModalProps) => {
  const { workspaceId } = useParamIds();
  const inviteLinkMutation = useInviteLink();

  useEffect(() => {
    if (open && workspaceId) {
      inviteLinkMutation.mutate(workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaceId]);

  const handleCopy = () => {
    const url = inviteLinkMutation.data?.url;
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Invite link copied to clipboard!"));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite people to {name}</DialogTitle>
          <DialogDescription>
            Share this link with your teammates to invite them to your workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-y-4 items-center justify-center py-4 w-full">
          <div className="w-full flex flex-col gap-2">
            <Label>Share this link</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopy}
              disabled={inviteLinkMutation.isPending || !inviteLinkMutation.data?.url}
            >
              {inviteLinkMutation.isPending
                ? "Generating link..."
                : "Copy Invite Link"}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-end w-full mt-2">
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
