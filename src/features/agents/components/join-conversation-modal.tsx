'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DialogClose } from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJoinConversation } from '../hooks/use-agents-mutations';
import { useParamIds } from '@/hooks/use-param-ids';

interface JoinConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinConversationModal = ({
  isOpen,
  onClose,
}: JoinConversationModalProps) => {
  const { workspaceId } = useParamIds();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState('');

  const joinConversation = useJoinConversation(workspaceId);

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;

    try {
      const response = await joinConversation.mutateAsync({
        inviteCode: inviteCode.trim(),
      });
      
      // Navigate to the conversation
      router.push(`/${workspaceId}/agents/${response.agent.id}/${response.conversation.id}`);
      onClose();
      setInviteCode('');
    } catch (error) {
      console.error('Failed to join conversation:', error);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join Agent Conversation</DialogTitle>
          <DialogClose className="absolute right-4 top-4">
            <X className="h-4 w-4" />
          </DialogClose>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="Enter invite code (e.g. ABC12345)"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              className="font-mono text-center tracking-widest"
              maxLength={8}
            />
          </div>
          
          <p className="text-sm text-muted-foreground">
            Enter the 8-character invite code shared by the conversation creator.
          </p>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleJoin}
              disabled={!inviteCode.trim() || joinConversation.isPending}
            >
              {joinConversation.isPending ? 'Joining...' : 'Join Conversation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};