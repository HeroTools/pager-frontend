import { TrashIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { FaChevronDown } from "react-icons/fa";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRemoveChannel } from "@/features/channels/api/useRemoveChannel";
import { useUpdateChannel } from "@/features/channels/api/useUpdateChannel";
import { useCurrentMember } from "@/features/members/api/useCurrentMember";
import { useChannelId } from "@/hooks/useChannelId";
import { useConfirm } from "@/hooks/useConfirm";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";

interface HeaderProps {
  title: string;
}

export const Header = ({ title }: HeaderProps) => {
  const router = useRouter();
  const channelId = useChannelId();
  const workspaceId = useWorkspaceId();
  const currentMember = useCurrentMember({
    workspaceId,
  });

  const [name, setName] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [ConfirmDialog, confirm] = useConfirm(
    "Delete this channel?",
    "You are about to delete this channel. This action is irreversible"
  );

  const updateChannel = useUpdateChannel();
  const removeChannel = useRemoveChannel();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\s+/g, "-").toLowerCase();
    setName(value);
  };

  const handleEditOpen = (open: boolean) => {
    if (currentMember.data?.role !== "admin") return;

    setEditOpen(open);
  };

  const handleClose = () => {
    setEditOpen(false);
    setName("");
  };

  const handleSave = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    updateChannel
      .mutateAsync({
        id: channelId,
        name: name,
      })
      .then(() => {
        toast.success("Channel updated");
        handleClose();
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to update channel");
      });
  };

  const handleRemove = async () => {
    const ok = await confirm();
    if (!ok) return;
    removeChannel
      .mutateAsync({
        id: channelId,
      })
      .then(() => {
        toast.success("Channel removed");
        router.replace(`/workspace/${workspaceId}`);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to remove channel");
      });
  };

  return (
    <>
      <ConfirmDialog />
      <div className="bg-white border-b h-[49px] flex items-center px-4 overflow-hidden">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-lg font-semibold px-2 overflow-hidden w-auto"
            >
              <span className="truncate"># {title}</span>
              <FaChevronDown className="size-2.5 ml-2" />
            </Button>
          </DialogTrigger>
          <DialogContent className="p-0 bg-gray-50 overflow-hidden">
            <DialogHeader className="p-4 border-b bg-white">
              <DialogTitle># {title}</DialogTitle>
            </DialogHeader>
            <div className="px-4 pb-4 flex flex-col gap-y-2">
              <Dialog open={editOpen} onOpenChange={handleEditOpen}>
                <DialogTrigger asChild>
                  <div className="px-5 py-4 bg-white rounded-lg border cursor-pointer hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Channel name</p>
                      {currentMember.data?.role === "admin" && (
                        <p className="text-sm text-[#1264a3] hover:underline font-semibold">
                          Edit
                        </p>
                      )}
                    </div>
                    <p className="text-sm"># {title}</p>
                  </div>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rename this channel</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleSave}>
                    <Input
                      value={name}
                      disabled={updateChannel.isPending}
                      onChange={handleChange}
                      required
                      autoFocus
                      minLength={3}
                      maxLength={80}
                      placeholder="e.g. plan-budget"
                    />
                  </form>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        variant="outline"
                        disabled={updateChannel.isPending}
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button disabled={updateChannel.isPending}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {currentMember.data?.role === "admin" && (
                <Button
                  className="flex justify-start items-center gap-x-2 px-5 py-4 bg-white rounded-lg cursor-pointer border hover:bg-gray-50 text-rose-600"
                  onClick={handleRemove}
                  disabled={removeChannel.isPending}
                >
                  <TrashIcon className="size-4" />
                  <p className="text-sm font-semibold">Delete channel</p>
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};
