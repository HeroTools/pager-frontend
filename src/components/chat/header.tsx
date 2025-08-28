import { ChevronLeft, Hash, Lock, LogOut, MoreVertical, Settings, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FC, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useUIStore } from '@/stores/ui-store';

import { ChannelDetailsModal } from '@/components/channel-details-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  const isLoading = !channel.name;
  const isConversationLoading = chatType === 'conversation' && (!conversationData || !currentUser);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'members' | 'settings'>('members');
  const { workspaceId } = useParamIds();
  const removeChannelMembers = useRemoveChannelMembers();
  const { user } = useCurrentUser(workspaceId);
  const router = useRouter();
  const { setProfilePanelOpen } = useUIStore();

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
      conversationMembers?.filter((member: any) => member.user.id !== currentUser.id);

    if (conversation.is_group_conversation) {
      // Group DM: show comma-separated names of other members
      const names = otherMembers?.map((m: any) => m.workspace_member?.user?.name || m.user?.name);
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
      // Use workspace_member_id field, not id
      const workspaceMemberId = otherMember.workspace_member?.id || otherMember.workspace_member_id;
      return {
        type: 'dm',
        user: user,
        workspaceMemberId: workspaceMemberId,
      };
    } else if (otherMembers.length === 0) {
      // Self-conversation: show current user's avatar
      const selfMember = conversationMembers.find(
        (member: any) => member.user.id === currentUser.id,
      );
      const user = selfMember?.workspace_member?.user || selfMember?.user || currentUser;
      // Use workspace_member_id field, not id
      const workspaceMemberId = selfMember?.workspace_member?.id || selfMember?.workspace_member_id;
      return {
        type: 'self',
        user: user,
        workspaceMemberId: workspaceMemberId,
      };
    } else {
      // Group conversation (2+ other members): show comma-separated names
      const names = otherMembers?.map((m: any) => m.workspace_member?.user?.name || m.user?.name);
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
  };

  const conversationDisplay = chatType === 'conversation' ? getConversationHeaderDisplay() : null;

  const currentChannelMember = useMemo(() => {
    return members.find((member) => member.workspace_member.user.id === user?.id);
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

  const handleBack = () => {
    router.push(`/${workspaceId}`);
  };

  const handleAvatarClick = (workspaceMemberId: string) => {
    setProfilePanelOpen(workspaceMemberId);
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="flex items-center gap-2">
        <Button onClick={handleBack} variant="ghost" size="sm" className="p-0 h-8 w-8 md:hidden">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {chatType === 'conversation' ? (
          // For conversations, show avatar only for 1-on-1 or self conversations
          isConversationLoading ? (
            // Show skeleton avatar while loading
            <Skeleton className="w-6 h-6 rounded-md" />
          ) : conversationDisplay?.type === 'group' ? (
            // Group DM with 3+ people: no avatar, just names in the title
            <></>
          ) : (
            // DM or Self: show avatar
            <Avatar
              className="w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity"
              workspaceMemberId={conversationDisplay?.workspaceMemberId}
              showPresence={true}
              presenceSize="md"
              onClick={() =>
                conversationDisplay?.workspaceMemberId &&
                handleAvatarClick(conversationDisplay.workspaceMemberId)
              }
            >
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
        {isLoading ? (
          <Skeleton className="h-6 w-32" />
        ) : (
          <h2 className="font-semibold text-lg text-foreground">
            {chatType === 'conversation' && conversationDisplay?.type === 'group'
              ? conversationDisplay.names
              : channel.name}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Member Avatars - click to open channel details (only for channels) */}
        {chatType === 'channel' && (
          <Button
            onClick={() => {
              setModalInitialTab('members');
              setDetailsModalOpen(true);
            }}
            variant="ghost"
            className="flex items-center -space-x-2 focus:outline-none group relative px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
            title="Channel details"
          >
            {visibleMembers.map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <Avatar
                    className="h-7 w-7 border-2 border-background bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                    workspaceMemberId={member.workspace_member.id}
                    showPresence={false}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the button's onClick from firing
                      handleAvatarClick(member.workspace_member.id);
                    }}
                  >
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
              <div className="h-7 w-7 flex items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-background text-muted-foreground">
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
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
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
