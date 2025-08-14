'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useParamIds } from '@/hooks/use-param-ids';
import { useAgents } from '../hooks/use-agents';
import { useCreateMultiUserConversation } from '../hooks/use-agents-mutations';

const createConversationSchema = z.object({
  agentId: z.string().min(1, 'Please select an agent'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isPublic: z.boolean().default(false),
});

type CreateConversationForm = z.infer<typeof createConversationSchema>;

interface CreateMultiUserConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateMultiUserConversationModal = ({
  isOpen,
  onClose,
}: CreateMultiUserConversationModalProps) => {
  const { workspaceId } = useParamIds();
  const router = useRouter();
  const [showInviteCode, setShowInviteCode] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const { data: agents, isLoading: isLoadingAgents } = useAgents(workspaceId);
  const createConversation = useCreateMultiUserConversation(workspaceId);

  const form = useForm<CreateConversationForm>({
    resolver: zodResolver(createConversationSchema),
    defaultValues: {
      agentId: '',
      title: '',
      description: '',
      isPublic: false,
    },
  });

  const handleSubmit = async (data: CreateConversationForm) => {
    try {
      const response = await createConversation.mutateAsync({
        agentId: data.agentId,
        title: data.title,
        description: data.description || undefined,
        isPublic: data.isPublic,
      });

      if (data.isPublic && response.invite_code) {
        setInviteCode(response.invite_code);
        setShowInviteCode(true);
      } else {
        // Navigate to the new conversation
        router.push(`/${workspaceId}/agents/${data.agentId}/${response.conversation.id}`);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleCopyInviteCode = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
    }
  };

  const handleFinish = () => {
    const agentId = form.getValues('agentId');
    const conversationId = inviteCode; // Assuming we have the conversation ID available
    // Navigate to the conversation
    if (agentId) {
      router.push(`/${workspaceId}/agents/${agentId}`);
    }
    onClose();
  };

  if (showInviteCode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Conversation Created!</DialogTitle>
            <DialogClose className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your public conversation has been created. Share this invite code with others:
            </p>

            <div className="flex items-center space-x-2">
              <Input
                value={inviteCode || ''}
                readOnly
                className="font-mono text-center text-lg tracking-widest"
              />
              <Button onClick={handleCopyInviteCode} variant="outline" size="sm">
                Copy
              </Button>
            </div>

            <div className="flex justify-end space-x-2">
              <Button onClick={handleFinish} className="w-full">
                Go to Conversation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Multi-User Agent Conversation</DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="agentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agents?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conversation Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Marketing Team Chat with AI" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the purpose of this conversation..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Public Conversation</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Allow anyone in the workspace to discover and join
                    </div>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={createConversation.isPending || isLoadingAgents}>
                {createConversation.isPending ? 'Creating...' : 'Create Conversation'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
