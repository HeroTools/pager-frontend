import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import type { FormEvent } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useGetMembers } from '@/features/members';
import { useConversationCreateStore } from '../store/conversation-create-store';
import MemberSearchSelect from '@/components/member-search-select';
import { Button } from '@/components/ui/button';
import { useConversations } from '../hooks/use-conversations';

export const CreateConversationModal = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();

  const {
    selectedMembers,
    cancelConversationCreation,
    removeMember,
    selectMember,
    isCreatingConversation,
  } = useConversationCreateStore();

  const { data: availableMembers = [] } = useGetMembers(workspaceId);
  const { createConversation } = useConversations(workspaceId);

  const handleClose = () => {
    cancelConversationCreation();
  };

  const getConversationTitle = () => {
    if (selectedMembers.length === 0) {
      return 'New chat';
    }
    if (selectedMembers.length === 1) {
      return `Chat with ${selectedMembers[0].user.name}`;
    }
    if (selectedMembers.length === 2) {
      return `${selectedMembers[0].user.name}, ${selectedMembers[1].user.name}`;
    }
    return `${selectedMembers[0].user.name}, ${
      selectedMembers[1].user.name
    } and ${selectedMembers.length - 2} other${selectedMembers.length > 3 ? 's' : ''}`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one person to chat with');
      return;
    }

    if (typeof workspaceId !== 'string') {
      toast.error('Workspace ID is required');
      return;
    }

    const memberIds = selectedMembers.map((m) => m.id);

    try {
      const newConversation = await createConversation.mutateAsync({
        participantMemberIds: memberIds,
      });

      // Navigate to the new conversation
      router.push(`/${workspaceId}/d-${newConversation.id}`);

      handleClose();
      toast.success('Conversation created');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create conversation');
    }
  };

  const canSubmit = selectedMembers.length > 0 && !createConversation.isPending;

  return (
    <Dialog open={isCreatingConversation} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            Start a new conversation
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Conversation Preview */}
          {selectedMembers.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-md border">
              <div className="flex -space-x-2">
                {selectedMembers.slice(0, 3).map((member, index) => (
                  <div
                    key={member.id}
                    className="w-8 h-8 rounded-full bg-background border-2 border-background flex items-center justify-center text-sm relative"
                    style={{ zIndex: selectedMembers.length - index }}
                  >
                    {member.user?.image ? (
                      <img
                        src={member.user.image}
                        alt={member.user.name || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-secondary-foreground">
                        {member.user?.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                ))}
                {selectedMembers.length > 3 && (
                  <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                    +{selectedMembers.length - 3}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-foreground">{getConversationTitle()}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedMembers.length === 1 ? 'Direct message' : 'Group chat'}
                </div>
              </div>
            </div>
          )}

          {/* Member Search */}
          <div className="space-y-3">
            <MemberSearchSelect
              selectedMembers={selectedMembers}
              onMemberSelect={selectMember}
              onMemberRemove={removeMember}
              placeholder="Search for people..."
              availableMembers={availableMembers}
            />
          </div>

          {/* Empty State */}
          {selectedMembers.length === 0 && (
            <div className="text-center py-6">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Search for people to start a conversation
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createConversation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="min-w-[100px]">
              {createConversation.isPending ? 'Creating...' : 'Create Chat'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
