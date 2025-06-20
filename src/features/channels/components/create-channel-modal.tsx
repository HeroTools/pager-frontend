import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useCreateChannel } from "..";
import { useCreateChannelModal } from "../store/use-create-channel-modal";
import { toast } from "sonner";
import { RadioGroup } from "@/components/ui/radio-group";
import type { ChannelType } from "@/types/database";
import { channelsApi } from "../api/channels-api";
import { Hash, Lock } from "lucide-react";

export const CreateChannelModal = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [name, setName] = useState("");
  const [step, setStep] = useState(1);
  const [channelType, setChannelType] = useState<ChannelType>("public");
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteMode, setInviteMode] = useState<'all' | 'specific'>('specific');

  const { open, setOpen } = useCreateChannelModal();

  const { mutateAsync, isPending } = useCreateChannel();

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleClose = () => {
    setName("");
    setStep(1);
    setChannelType("public");
    setInvites([]);
    setInviteInput("");
    setInviteMode('specific');
    setOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, "-").toLowerCase();
    setName(value);
  };

  const handleNext = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep(2);
  };

  const handleInviteAdd = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (inviteInput && isValidEmail(inviteInput) && !invites.includes(inviteInput)) {
      setInvites([...invites, inviteInput]);
      setInviteInput("");
    }
  };

  const handleInviteRemove = (email: string) => {
    setInvites(invites.filter((i) => i !== email));
  };

  const handleFinish = async () => {
    if (typeof workspaceId !== "string") {
      toast.error("Workspace ID is required");
      return;
    }
    mutateAsync({
      name,
      workspace_id: workspaceId,
      channel_type: channelType,
    })
      .then(async (channel) => {
        // Invite teammates after channel creation
        let emailsToInvite = invites;
        if (inviteMode === 'all') {
          // TODO: Fetch all workspace member emails and invite them here
          // For now, just skip inviting specific emails
          emailsToInvite = [];
        }
        await Promise.all(
          emailsToInvite.map(async (email) => {
            try {
              await channelsApi.addChannelMember(workspaceId, channel.channelId, { workspace_member_id: email });
            } catch (err) {
              // Optionally handle errors for individual invites
              console.error(`Failed to invite ${email}:`, err);
            }
          })
        );
      
        router.push(`/${workspaceId}/c-${channel.channelId}`);
        handleClose();
        toast.success("Channel created");
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to create channel");
      });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? (
              "Add a channel"
            ) : (
              <span className="flex items-center gap-2">
                Invite people to
                {channelType === "public" ? (
                  <Hash className="size-5 text-muted-foreground" />
                ) : (
                  <Lock className="size-5 text-muted-foreground" />
                )}
                {name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {step === 1 && (
          <form className="space-y-4" onSubmit={handleNext}>
            <div>
              <label htmlFor="channel-name" className="mb-2 block text-sm font-medium">Channel name</label>
              <div className="relative">
                {channelType === "public" ? (
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                ) : (
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                )}
                <Input
                  id="channel-name"
                  value={name}
                  onChange={handleChange}
                  disabled={isPending}
                  autoFocus
                  placeholder="example-channel"
                  required
                  minLength={3}
                  maxLength={80}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Channel type</div>
              <RadioGroup
                options={[
                  { label: "Public - Anyone in the workspace can join", value: "public" },
                  { label: "Private - Only invited people can join", value: "private" },
                ]}
                value={channelType}
                onChange={(val) => setChannelType(val as ChannelType)}
                name="channel-type"
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={isPending}>Next</Button>
            </div>
          </form>
        )}
        {step === 2 && (
          <>
            {channelType === 'private' ? (
              <form className="space-y-4" onSubmit={handleInviteAdd}>
                <div className="mb-2 text-sm font-medium">Invite teammates</div>
                <div className="flex gap-2">
                  <Input
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    placeholder="Enter email address"
                    disabled={isPending}
                  />
                  <Button type="submit" disabled={isPending || !isValidEmail(inviteInput) || invites.includes(inviteInput)}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invites.map((email) => (
                    <span key={email} className="flex items-center cursor-pointer bg-muted px-2 py-1 rounded text-xs">
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
              </form>
            ) : (
              <>
                <div className="mb-4">
                  <RadioGroup
                    options={[
                      { label: "Add all members of the workspace", value: "all" },
                      { label: "Add specific people", value: "specific" },
                    ]}
                    value={inviteMode}
                    onChange={(val) => setInviteMode(val as 'all' | 'specific')}
                    name="invite-mode"
                  />
                </div>
                {inviteMode === 'specific' && (
                  <form className="space-y-4" onSubmit={handleInviteAdd}>
                    <div className="mb-2 text-sm font-medium">Invite teammates</div>
                    <div className="flex gap-2">
                      <Input
                        value={inviteInput}
                        onChange={(e) => setInviteInput(e.target.value)}
                        placeholder="Enter email address"
                        disabled={isPending}
                      />
                      <Button type="submit" disabled={isPending || !isValidEmail(inviteInput) || invites.includes(inviteInput)}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invites.map((email) => (
                        <span key={email} className="flex items-center cursor-pointer bg-muted px-2 py-1 rounded text-xs">
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
                  </form>
                )}
              </>
            )}
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>Back</Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleFinish} disabled={isPending}>Skip for now</Button>
                <Button onClick={handleFinish} disabled={isPending}>Finish</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
