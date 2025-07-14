import { useGetChannelMembers } from '@/features/channels/hooks/use-channels-mutations';
import type { ChannelMemberResponse } from '@/features/channels/types';
import { ChannelMemberRole } from '@/types/database';
import { useMemo } from 'react';
import type { ChatMember, MemberWithUser } from '../types';
import { useGetMembers } from './use-members';

export function useChannelMembers(
  workspaceId: string,
  channelId: string | undefined,
  enabled: boolean = true,
) {
  const { data: workspaceMembers, isLoading: isLoadingWorkspaceMembers } =
    useGetMembers(workspaceId);

  const { data: channelMembers, isLoading: isLoadingChannelMembers } = useGetChannelMembers(
    workspaceId,
    channelId || '',
    enabled,
  );

  const combinedMembers = useMemo((): ChatMember[] => {
    if (!workspaceMembers || !channelMembers || !channelId) {
      return [];
    }

    return channelMembers
      .map((channelMember: ChannelMemberResponse) => {
        const workspaceMember = workspaceMembers.find(
          (wm: MemberWithUser) => wm.id === channelMember.workspace_member_id,
        );

        if (!workspaceMember) {
          return null;
        }

        const member: ChatMember = {
          id: channelMember.channel_member_id,
          workspace_member: workspaceMember,
          role: channelMember.channel_role as ChannelMemberRole,
          joined_at: channelMember.joined_at,
          left_at: channelMember.left_at,
          last_read_message_id: channelMember.last_read_message_id,
          notifications_enabled: channelMember.notifications_enabled,
          is_hidden: false,
        };
        return member;
      })
      .filter(Boolean) as ChatMember[];
  }, [workspaceMembers, channelMembers, channelId]);

  return {
    members: combinedMembers,
    isLoading: isLoadingWorkspaceMembers || isLoadingChannelMembers,
    workspaceMembers,
    channelMembers,
    // Helper methods
    getMemberByUserId: (userId: string) =>
      combinedMembers.find((member) => member.workspace_member.user_id === userId),
    getMemberByChannelMemberId: (channelMemberId: string) =>
      combinedMembers.find((member) => member.id === channelMemberId),
    isUserInChannel: (userId: string) =>
      combinedMembers.some((member) => member.workspace_member.user_id === userId),
    getChannelAdmins: () => combinedMembers.filter((member) => member.role === 'admin'),
    getChannelRegularMembers: () => combinedMembers.filter((member) => member.role !== 'admin'),
  };
}
