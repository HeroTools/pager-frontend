import { useMutation, useQuery } from '@tanstack/react-query';
import { membersApi } from './members-api';
import type { Member } from './members-api';

// Get all members for a workspace
export const useGetMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      const response = await membersApi.getMembers(workspaceId);
      return response.data.data.members;
    },
    enabled: !!workspaceId,
  });
};

// Get a single member
export const useGetMember = (workspaceId: string, memberId: string) => {
  return useQuery({
    queryKey: ['member', workspaceId, memberId],
    queryFn: async () => {
      const response = await membersApi.getMember(workspaceId, memberId);
      return response.data.data.member;
    },
    enabled: !!(workspaceId && memberId),
  });
};

// Update member role
export const useUpdateMemberRole = () => {
  return useMutation({
    mutationFn: async ({ workspaceId, memberId, role }: { workspaceId: string; memberId: string; role: Member['role'] }) => {
      const response = await membersApi.updateMemberRole(workspaceId, memberId, role);
      return response.data.data.member;
    },
  });
};

// Remove a member
export const useRemoveMember = () => {
  return useMutation({
    mutationFn: async ({ workspaceId, memberId }: { workspaceId: string; memberId: string }) => {
      await membersApi.removeMember(workspaceId, memberId);
    },
  });
}; 