import { CopyIcon, Settings2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useParamIds } from "@/hooks/use-param-ids";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { useInviteMember } from "@/features/members/hooks/use-members";
import { useInviteLink } from "@/features/auth/hooks/use-auth-mutations";

interface InviteModalProps {
  open: boolean;
  name: string;
  setOpen: (open: boolean) => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "Never", value: "never" },
];

export const InviteModal = ({ open, name, setOpen }: InviteModalProps) => {
  const { workspaceId } = useParamIds();
  const [inviteInput, setInviteInput] = useState("");
  const [invites, setInvites] = useState<string[]>([]);
  const { mutateAsync, isPending } = useInviteMember();
  const inviteLinkMutation = useInviteLink();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expiry, setExpiry] = useState("30d");
  const [notify, setNotify] = useState(true);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  useEffect(() => {
    if (open && workspaceId) {
      inviteLinkMutation.mutate(workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workspaceId]);

  const handleInviteAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      inviteInput &&
      isValidEmail(inviteInput) &&
      !invites.includes(inviteInput)
    ) {
      setInvites([...invites, inviteInput]);
      setInviteInput("");
    }
  };

  const handleInviteRemove = (email: string) => {
    setInvites(invites.filter((i) => i !== email));
  };

  const handleSendInvites = async () => {
    if (!invites.length) return;
    try {
      await Promise.all(
        invites.map(async (email) => {
          await mutateAsync({
            workspaceId: workspaceId!,
            data: { email },
          });
        })
      );
      toast.success(`Invites sent to ${invites.join(", ")}`);
      setInvites([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to send invites");
    }
  };

  const handleCopy = () => {
    const url = inviteLinkMutation.data?.url;
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Invite link copied to clipboard"));
  };

  // Placeholder for deactivating link
  const handleDeactivate = () => {
    toast.success("Link deactivated (not implemented)");
  };

  // Placeholder for saving settings
  const handleSaveSettings = () => {
    setSettingsOpen(false);
    toast.success("Settings saved (not implemented)");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite people to {name}</DialogTitle>
            <DialogDescription>
              Enter email addresses to send invites, or copy the invite link
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-y-4 items-center justify-center py-4 w-full">
            <div className="w-full flex flex-col gap-2">
              <Label htmlFor="invite-email">Send to</Label>
              <form className="flex gap-2 w-full" onSubmit={handleInviteAdd}>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@company.com"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  className="flex-1"
                  autoFocus
                  disabled={isPending}
                />
                <Button
                  type="submit"
                  disabled={
                    !isValidEmail(inviteInput) ||
                    invites.includes(inviteInput) ||
                    isPending
                  }
                >
                  Add
                </Button>
              </form>
              <div className="flex flex-wrap gap-2 mt-2">
                {invites.map((email) => (
                  <span
                    key={email}
                    className="flex items-center cursor-pointer bg-muted px-2 py-1 rounded text-xs"
                  >
                    {email}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-1 h-4 w-4 p-0"
                      onClick={() => handleInviteRemove(email)}
                      aria-label={`Remove ${email}`}
                    >
                      ×
                    </Button>
                  </span>
                ))}
              </div>
              <Button
                className="mt-2"
                onClick={handleSendInvites}
                disabled={!invites.length || isPending}
              >
                {isPending ? "Sending..." : "Send Invites"}
              </Button>
            </div>
            <div className="w-full flex flex-col gap-2 mt-4">
              <Label>Or share this link</Label>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopy}
                disabled={inviteLinkMutation.isPending}
              >
                {inviteLinkMutation.isPending
                  ? "Loading..."
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
      {/* Link Settings Modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation link settings</DialogTitle>
            <DialogDescription>
              To safeguard the privacy of your workspace, only share this link
              with people who are part of your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <Label className="mb-1 block">Link set to expire after...</Label>
              <RadioGroup
                options={EXPIRY_OPTIONS}
                value={expiry}
                onChange={setExpiry}
                name="expiry"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="accent-primary size-4 rounded border border-border-subtle"
              />
              Notify me whenever someone joins using this link
            </label>
            <Button variant="destructive" onClick={handleDeactivate}>
              Deactivate Link
            </Button>
          </div>
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Back
            </Button>
            <Button onClick={handleSaveSettings}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
