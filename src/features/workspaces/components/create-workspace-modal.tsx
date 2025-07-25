import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RESERVED_NAMES } from '@/lib/constants';
import { useCreateWorkspace } from '..';
import { useCreateWorkspaceModal } from '../store/use-create-workspace-modal';

interface CreateWorkspaceFormData {
  name: string;
  agentName: string;
}

export const CreateWorkspaceModal = () => {
  const router = useRouter();

  const form = useForm<CreateWorkspaceFormData>({
    defaultValues: {
      name: '',
      agentName: 'Assistant',
    },
  });

  const { open, setOpen } = useCreateWorkspaceModal();
  const { mutateAsync, isPending } = useCreateWorkspace();

  const handleClose = () => {
    setOpen(false);
    form.reset();
  };

  const handleCreateWorkspace = form.handleSubmit(async ({ name, agentName }) => {
    try {
      const workspace = await mutateAsync({ name, agentName });
      toast.success('Workspace created');
      router.push(`/${workspace.id}`);
      handleClose();
    } catch (err: any) {
      const serverMessage = err?.response?.data?.error;
      if (serverMessage) {
        form.setError('name', { type: 'server', message: serverMessage });
      } else {
        toast.error(err?.message ?? 'Failed to create workspace');
      }
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a workspace</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleCreateWorkspace}>
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              {...form.register('name', {
                required: 'Workspace name is required',
                minLength: { value: 3, message: 'At least 3 characters' },
                maxLength: { value: 80, message: 'Maximum 80 characters' },
                validate: (value) => {
                  const lower = value.trim().toLowerCase();
                  return !RESERVED_NAMES.includes(lower) || 'That name is reserved';
                },
              })}
              disabled={isPending}
              autoFocus
              placeholder="e.g. My Workspace, My Project, Homebase"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-name">AI assistant name</Label>
            <Input
              id="agent-name"
              {...form.register('agentName', {
                required: 'Agent name is required',
                minLength: { value: 2, message: 'At least 2 characters' },
                maxLength: { value: 255, message: 'Maximum 255 characters' },
              })}
              disabled={isPending}
              placeholder="e.g. Assistant, Helper, Bot"
            />
            {form.formState.errors.agentName && (
              <p className="text-sm text-destructive">{form.formState.errors.agentName.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              {isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
