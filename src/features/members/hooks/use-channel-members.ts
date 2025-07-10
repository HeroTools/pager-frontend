import { useGetChannelMembers } from '@/features/channels/hooks/use-channels-mutations';
import type { ChannelMember, ChannelMemberResponse } from '@/features/channels/types';
import { useMemo } from 'react';
import type { MemberWithUser } from '../types';
import { useGetMembers } from './use-members';

export function useChannelMembers(workspaceId: string, channelId: string | undefined) {
  const { data: workspaceMembers, isLoading: isLoadingWorkspaceMembers } =
    useGetMembers(workspaceId);

  const { data: channelMembers, isLoading: isLoadingChannelMembers } = useGetChannelMembers(
    workspaceId,
    channelId || '',
  );

  const combinedMembers = useMemo((): ChannelMember[] => {
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

        const member: ChannelMember = {
          workspace_member_id: workspaceMember.id,
          user_id: workspaceMember.user_id,
          user: workspaceMember.user,
          role: workspaceMember.role,
          is_deactivated: workspaceMember.is_deactivated,
          channel_member_id: channelMember.channel_member_id,
          channel_role: channelMember.channel_role,
          joined_at: channelMember.joined_at,
          left_at: channelMember.left_at,
          created_at: workspaceMember.created_at,
          updated_at: workspaceMember.updated_at,
          last_read_message_id: channelMember.last_read_message_id,
          notifications_enabled: channelMember.notifications_enabled,
          workspace_id: workspaceMember.workspace_id,
          channel_id: channelMember.channel_id,
        };
        return member;
      })
      .filter(Boolean) as ChannelMember[];
  }, [workspaceMembers, channelMembers, channelId]);

  return {
    members: combinedMembers,
    isLoading: isLoadingWorkspaceMembers || isLoadingChannelMembers,
    workspaceMembers,
    channelMembers,
    // Helper methods
    getMemberByUserId: (userId: string) =>
      combinedMembers.find((member) => member.user_id === userId),
    getMemberByChannelMemberId: (channelMemberId: string) =>
      combinedMembers.find((member) => member.channel_member_id === channelMemberId),
    isUserInChannel: (userId: string) =>
      combinedMembers.some((member) => member.user_id === userId),
    getChannelAdmins: () =>
      combinedMembers.filter(
        (member) => member.role === 'admin' || member.channel_role === 'admin',
      ),
    getChannelRegularMembers: () =>
      combinedMembers.filter(
        (member) => member.role !== 'admin' && member.channel_role !== 'admin',
      ),
  };
}
