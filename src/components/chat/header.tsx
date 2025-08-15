import { ChevronLeft, Hash, Lock, LogOut, MoreVertical, Settings, Users } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCurrentUser } from '@/features/auth';
import { useGetUserChannels, useRemoveChannelMembers } from '@/features/channels';
import { ChatMember } from '@/features/members';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/stores/ui-store';
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
  const router = useRouter();
  const { workspaceId, id: channelId } = useParamIds();
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'members' | 'settings'>('members');
  const removeChannelMembers = useRemoveChannelMembers();
  const { user } = useCurrentUser(workspaceId);
  const { data: channels } = useGetUserChannels(workspaceId);
  const { setProfilePanelOpen } = useUIStore();

  const memberAvatars = useMemo(() => {
    const maxAvatars = 4;
    const visibleMembers = members.slice(0, maxAvatars);
    const extraCount = members.length - maxAvatars;

    return {
      visibleMembers,
      extraCount: extraCount > 0 ? extraCount : 0,
    };
  }, [members]);

  const conversationDisplay = useMemo(() => {
    if (chatType !== 'conversation' || !conversationData || !currentUser) return null;

    const { conversation, members: conversationMembers } = conversationData;
    const otherMembers =
      conversation.other_members ||
      conversationMembers?.filter((member: any) => member.user.id !== currentUser.id);

    if (conversation.is_group_conversation || otherMembers.length > 1) {
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
      const workspaceMemberId = otherMember.workspace_member?.id || otherMember.workspace_member_id;
      return {
        type: 'dm',
        user: user,
        workspaceMemberId: workspaceMemberId,
      };
    } else {
      // Self-conversation: show current user's avatar
      const selfMember = conversationMembers.find(
        (member: any) => member.user.id === currentUser.id,
      );
      const user = selfMember?.workspace_member?.user || selfMember?.user || currentUser;
      const workspaceMemberId = selfMember?.workspace_member?.id || selfMember?.workspace_member_id;
      return {
        type: 'self',
        user: user,
        workspaceMemberId: workspaceMemberId,
      };
    }
  }, [chatType, conversationData, currentUser]);

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

  const selectedChannel = useMemo(
    () => channels?.find((channel) => channel.id === channelId),
    [channels, channelId],
  );

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="flex items-center gap-2">
        <Button onClick={handleBack} variant="ghost" size="sm" className="p-0 h-8 w-8 md:hidden">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        {chatType === 'conversation' ? (
          conversationDisplay?.type === 'group' ? null : conversationDisplay ? (
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
          ) : (
            <Skeleton className="w-6 h-6 rounded-full" />
          )
        ) : chatType === 'channel' ? (
          channel.isPrivate ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Hash className="w-4 h-4 text-muted-foreground" />
          )
        ) : null}

        {chatType === 'channel' ? (
          <h2 className="font-semibold text-lg text-foreground">
            {selectedChannel?.name || channel.name}
          </h2>
        ) : chatType === 'conversation' ? (
          conversationDisplay ? (
            <h2 className="font-semibold text-lg text-foreground">
              {conversationDisplay?.type === 'group'
                ? conversationDisplay?.names
                : conversationDisplay?.user?.name || ''}
            </h2>
          ) : (
            <Skeleton className="h-6 w-32" />
          )
        ) : (
          <h2 className="font-semibold text-lg text-foreground">{channel.name}</h2>
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
            {memberAvatars.visibleMembers.map((member) => (
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

            {memberAvatars.extraCount > 0 && (
              <div className="h-7 w-7 flex items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-background text-muted-foreground">
                +{memberAvatars.extraCount}
              </div>
            )}
          </Button>
        )}

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
