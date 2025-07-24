import { Hash, Lock, LogOut, MoreVertical, Settings, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FC, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ChannelDetailsModal } from '@/components/channel-details-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/features/auth';
import { useRemoveChannelMembers } from '@/features/channels';
import { ChatMember } from '@/features/members';
import { useParamIds } from '@/hooks/use-param-ids';
import type { Channel } from '@/types/chat';

interface ChatHeaderProps {
  channel: Channel;
  members?: ChatMember[];
  chatType?: 'conversation' | 'channel' | 'agent';
  conversationData?: any;
  currentUser?: any;
}

export const ChatHeader: FC<ChatHeaderProps> = ({
  channel,
  members = [],
  chatType,
  conversationData,
  currentUser,
}) => {
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'members' | 'settings'>('members');
  const { workspaceId } = useParamIds();
  const removeChannelMembers = useRemoveChannelMembers();
  const { user } = useCurrentUser(workspaceId);
  const router = useRouter();

  // Show up to 4 avatars, then a +N indicator
  const maxAvatars = 4;
  const visibleMembers = members.slice(0, maxAvatars);
  const extraCount = members.length - maxAvatars;

  // Conversation display logic
  const getConversationHeaderDisplay = () => {
    if (!conversationData || !currentUser) return null;

    const { conversation, members: conversationMembers } = conversationData;
    const otherMembers =
      conversation.other_members ||
      conversationMembers.filter((member: any) => member.user.id !== currentUser.id);

    if (conversation.is_group_conversation) {
      // Group DM: show comma-separated names of other members
      const names = otherMembers.map((m: any) => m.workspace_member?.user?.name || m.user?.name);
      const uniqueNames = Array.from(new Set(names));
      const displayNames =
        uniqueNames.length < names.length
          ? `${uniqueNames.join(', ')} (${names.length} members)`
          : uniqueNames.join(', ');

      return {
        type: 'group',
        names: displayNames,
      };
    }

    if (otherMembers.length === 1) {
      // DM: show other person's avatar
      const otherMember = otherMembers[0];
      const user = otherMember.workspace_member?.user || otherMember.user;
      return {
        type: 'dm',
        user: user,
      };
    } else {
      // Self-conversation: show current user's avatar
      const selfMember = conversationMembers.find(
        (member: any) => member.user.id === currentUser.id,
      );
      const user = selfMember?.workspace_member?.user || selfMember?.user || currentUser;
      return {
        type: 'self',
        user: user,
      };
    }
  };

  const conversationDisplay = chatType === 'conversation' ? getConversationHeaderDisplay() : null;

  const currentChannelMember = useMemo(() => {
    return members.find((member) => member.workspace_member.user.id === user.id);
  }, [user, members]);

  const handleLeaveChannel = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    if (!currentChannelMember) {
      toast.error('Unable to leave channel - channel membership not found');
      return;
    }

    try {
      await removeChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [currentChannelMember.id],
        isCurrentUserLeaving: true,
      });

      toast.success('Left channel successfully');
      router.push(`/${workspaceId}`);
    } catch (error) {
      console.error('Failed to leave channel:', error);
      toast.error('Failed to leave channel');
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b">
      <div className="flex items-center gap-2">
        {chatType === 'conversation' ? (
          // For conversations, show avatar(s) or names
          conversationDisplay?.type === 'group' ? (
            // Group DM: no icon, just names in the title
            <></>
          ) : (
            // DM or Self: show avatar
            <Avatar className="w-6 h-6">
              <AvatarImage
                src={conversationDisplay?.user?.image || undefined}
                alt={conversationDisplay?.user?.name}
              />
              <AvatarFallback className="text-sm">
                {conversationDisplay?.user?.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          )
        ) : // For channels, show lock/hash icon
        channel.isPrivate ? (
          <Lock className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Hash className="w-4 h-4 text-muted-foreground" />
        )}
        <h2 className="font-semibold text-lg text-foreground">
          {chatType === 'conversation' && conversationDisplay?.type === 'group'
            ? conversationDisplay.names
            : channel.name}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {/* Member Avatars - click to open channel details (only for channels) */}
        {chatType === 'channel' && (
          <Button
            onClick={() => {
              setModalInitialTab('members');
              setDetailsModalOpen(true);
            }}
            variant="ghost"
            className="flex items-center -space-x-2 focus:outline-none group relative px-2 rounded-lg hover:bg-secondary transition-colors duration-200"
            title="Channel details"
          >
            {visibleMembers.map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6 border-2 border-background bg-secondary">
                    {member.workspace_member.user.image ? (
                      <AvatarImage
                        src={member.workspace_member.user.image}
                        alt={member.workspace_member.user.name}
                      />
                    ) : (
                      <AvatarFallback>
                        {member.workspace_member.user.name?.[0] || <Users className="w-4 h-4" />}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>{member.workspace_member.user.name}</TooltipContent>
              </Tooltip>
            ))}

            {extraCount > 0 && (
              <div className="h-6 w-6 flex items-center justify-center rounded-full bg-secondary text-xs font-medium border-2 border-background text-muted-foreground">
                +{extraCount}
              </div>
            )}
          </Button>
        )}

        {/* Kebab Menu (only for channels) */}
        {chatType === 'channel' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="iconSm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  setModalInitialTab('settings');
                  setDetailsModalOpen(true);
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {!channel.isDefault && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleLeaveChannel}
                  disabled={removeChannelMembers.isPending}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {removeChannelMembers.isPending ? 'Leaving...' : 'Leave channel'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Channel Details Modal (only for channels) */}
      {chatType === 'channel' && (
        <ChannelDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          channel={channel}
          members={members}
          initialTab={modalInitialTab}
        />
      )}
    </div>
  );
};
