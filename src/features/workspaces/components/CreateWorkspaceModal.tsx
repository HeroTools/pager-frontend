import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateWorkspace } from "../api/useCreateWorkspace";
import { useCreateWorkspaceModal } from "../store/useCreateWorkspaceModal";

export const CreateWorkspaceModal = () => {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      name: "",
    },
  });

  const { open, setOpen } = useCreateWorkspaceModal();

  const { mutateAsync, isPending } = useCreateWorkspace();

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  const handleCreateWorkspace = form.handleSubmit(async ({ name }) => {
    const workspaceId = await mutateAsync({ name });
    toast.success("Workspace created");
    router.push(`/workspace/${workspaceId}`);
    handleClose();
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a workspace</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleCreateWorkspace}>
          <Input
            {...form.register("name", {
              required: true,
              minLength: 3,
              maxLength: 80,
            })}
            disabled={isPending}
            autoFocus
            placeholder="Workspace name e.g. 'Work', 'Personal', 'Home'"
          />
          <div className="flex justify-end">
            <Button disabled={isPending}>Create</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
