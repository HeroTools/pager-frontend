import { TrashIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDeleteWorkspace, useUpdateWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useConfirm } from '@/hooks/use-confirm';

interface PreferenceModalProps {
  initialVlaue: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const PreferenceModal = ({ initialVlaue, open, setOpen }: PreferenceModalProps) => {
  const router = useRouter();
  const [ConfirmDialog, confirm] = useConfirm('Are you sure?', 'This action is irreversible');

  const workspaceId = useWorkspaceId();
  const [editOpen, setEditOpen] = useState(false);

  const form = useForm({
    defaultValues: {
      name: initialVlaue,
    },
  });
  const value = form.watch('name');

  const updateWorkspace = useUpdateWorkspace();
  const removeWorkspace = useDeleteWorkspace();

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  const handleUpdateWorkspace = form.handleSubmit(async ({ name }) => {
    if (!workspaceId) {
      toast.error('Workspace ID not found.');
      return;
    }
    try {
      await updateWorkspace.mutateAsync({
        id: workspaceId as string,
        data: { name },
      });
      setEditOpen(false);
      toast.success('Workspace updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update workspace');
    }
  });

  const handleRemoveWorkspace = async () => {
    const ok = await confirm();
    if (!ok) return;
    if (!workspaceId) {
      toast.error('Workspace ID not found.');
      return;
    }
    try {
      await removeWorkspace.mutateAsync(workspaceId as string);
      toast.success('Workspace removed');
      router.replace('/');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove workspace');
    }
  };

  return (
    <>
      <ConfirmDialog />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="p-0 bg-secondary overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{initialVlaue}</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-4 flex flex-col gap-y-2">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <div className="px-5 py-4 rounded-lg border cursor-pointer hover:bg-secondary">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Workspace name</p>
                    <p className="text-sm text-muted-foreground hover:underline font-semibold">
                      Edit
                    </p>
                  </div>
                  <p className="text-sm">{value}</p>
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rename this workspace</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleUpdateWorkspace}>
                  <Input
                    {...form.register('name', {
                      required: true,
                      minLength: 3,
                      maxLength: 80,
                    })}
                    disabled={updateWorkspace.isPending}
                    autoFocus
                    placeholder="Workspace name e.g. 'Work', 'Personal', 'Home'"
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" disabled={updateWorkspace.isPending}>
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={updateWorkspace.isPending}>
                      Save
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              disabled={removeWorkspace.isPending}
              onClick={handleRemoveWorkspace}
              className="flex items-center justify-start gap-x-2 py-4 rounded-lg border cursor-pointer hover:bg-secondary text-text-destructive"
            >
              <TrashIcon className="size-4" />
              <p className="text-sm font-semibold">Delete workspace</p>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
