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
import { useState } from "react";

interface InviteModalProps {
  open: boolean;
  joinCode: string;
  name: string;
  setOpen: (open: boolean) => void;
}

const EXPIRY_OPTIONS = [
  { label: "1 day", value: "1d" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "Never", value: "never" },
];

export const InviteModal = ({
  open,
  joinCode,
  name,
  setOpen,
}: InviteModalProps) => {
  const { workspaceId } = useParamIds();
  const [email, setEmail] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expiry, setExpiry] = useState("30d");
  const [notify, setNotify] = useState(true);

  const inviteLink = `${window.location.origin}/join/${workspaceId}/${joinCode}`;

  const handleCopy = () => {
    navigator.clipboard
      .writeText(inviteLink)
      .then(() => toast.success("Invite link copied to clipboard"));
  };

  // Placeholder for sending invite (not implemented)
  const handleSend = () => {
    if (!email) return;
    toast.success(`Invite sent to ${email}`);
    setEmail("");
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
              Enter an email address to send an invite, or copy the invite link below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-y-4 items-center justify-center py-4 w-full">
            <div className="w-full flex flex-col gap-2">
              <label htmlFor="invite-email" className="text-sm font-medium">Send to</label>
              <div className="flex gap-2 w-full">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button onClick={handleSend} disabled={!email}>
                  Send
                </Button>
              </div>
            </div>
            <div className="w-full flex flex-col gap-2 mt-4">
              <label className="text-sm font-medium">Or share this link</label>
              <div className="flex gap-2 w-full items-center">
                <Input
                  value={inviteLink}
                  readOnly
                  className="flex-1 cursor-pointer"
                  onClick={e => {
                    (e.target as HTMLInputElement).select();
                  }}
                />
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <CopyIcon className="size-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="size-4 mr-2" />
                  Edit link settings
                </Button>
              </div>
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
              To safeguard the privacy of your workspace, only share this link with people who are part of your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Link set to expire after...</label>
              <select
                className="w-full rounded border bg-background px-3 py-2 text-foreground"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
              >
                {EXPIRY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notify}
                onChange={e => setNotify(e.target.checked)}
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
            <Button onClick={handleSaveSettings}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
