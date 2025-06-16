import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { useCreateChannel } from "../api/useCreateChannel";
import { useCreateChannelModal } from "../store/useCreateChannelModal";
import { toast } from "sonner";

export const CreateChannelModal = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const [name, setName] = useState("");

  const { open, setOpen } = useCreateChannelModal();

  const { mutateAsync, isPending } = useCreateChannel();

  const handleClose = () => {
    setName("");
    setOpen(false);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, "-").toLowerCase();
    setName(value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    mutateAsync({
      name,
      workspaceId,
    })
      .then((channelId) => {
        router.push(`/workspace/${workspaceId}/channel/${channelId}`);
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
          <DialogTitle>Add a channel</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input
            value={name}
            onChange={handleChange}
            disabled={isPending}
            autoFocus
            placeholder="e.g. plan-budget"
            required
            minLength={3}
            maxLength={80}
          />
          <div className="flex justify-end">
            <Button disabled={isPending}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
