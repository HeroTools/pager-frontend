'use client';

import { Button } from '@/components/ui/button';
import { useAddChannelMembers } from '@/features/channels';
import { useCurrentMember } from '@/features/members/hooks/use-members';
import { useParamIds } from '@/hooks/use-param-ids';
import { Hash, Loader } from 'lucide-react';
import { useState } from 'react';
import type { Channel } from '@/types/chat';

interface JoinChannelPromptProps {
  channel: Channel;
}

export const JoinChannelPrompt = ({ channel }: JoinChannelPromptProps) => {
  const { workspaceId } = useParamIds();
  const { data: currentMember } = useCurrentMember(workspaceId);
  const addChannelMembers = useAddChannelMembers();
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinChannel = async () => {
    if (!currentMember?.id) return;

    setIsJoining(true);
    addChannelMembers.mutate(
      {
        workspaceId,
        channelId: channel.id,
        data: {
          memberIds: [currentMember.id],
        },
      },
      {
        onSuccess: () => {
          setIsJoining(false);
        },
        onError: () => {
          setIsJoining(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-muted/30 rounded-lg mx-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="size-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Join this channel</h3>
      </div>

      <p className="text-muted-foreground text-center mb-6 max-w-md">
        You&apos;re viewing #{channel.name}. Join the channel to send messages and fully participate
        in the conversation.
      </p>

      {channel.description && (
        <p className="text-sm text-muted-foreground text-center mb-6 max-w-md italic">
          &ldquo;{channel.description}&rdquo;
        </p>
      )}

      <Button
        onClick={handleJoinChannel}
        disabled={isJoining || !currentMember?.id}
        size="lg"
        className="min-w-[120px]"
      >
        {isJoining ? (
          <>
            <Loader className="size-4 mr-2 animate-spin" />
            Joining...
          </>
        ) : (
          `Join #${channel.name}`
        )}
      </Button>
    </div>
  );
};
