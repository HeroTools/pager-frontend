import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { membersApi } from "../api/members-api";
import type {
  MemberEntity,
  MemberWithUser,
  UpdateMemberRoleData,
  InviteMemberData,
  MemberFilters,
  BulkUpdateMembersData,
  BulkRemoveMembersData,
} from "../types";

// Get current user's member record for a workspace
export const useCurrentMember = (workspaceId: string) => {
  return useQuery({
    queryKey: ["currentMember", workspaceId],
    queryFn: () => membersApi.getCurrentMember(workspaceId),
    enabled: !!workspaceId,
  });
};

// Get all members for a workspace
export const useGetMembers = (
  workspaceId: string,
  filters?: Partial<MemberFilters>
) => {
  return useQuery({
    queryKey: ["members", workspaceId, filters],
    queryFn: () => membersApi.getMembers(workspaceId, filters),
    enabled: !!workspaceId,
    staleTime: 8 * 60 * 60 * 1000,
  });
};

// Get all members with user data for a workspace
export const useGetMembersWithUsers = (
  workspaceId: string,
  filters?: Partial<MemberFilters>
) => {
  return useQuery({
    queryKey: ["members", workspaceId, "with-users", filters],
    queryFn: () => membersApi.getMembersWithUsers(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

// Get a single member
export const useGetMember = (workspaceId: string, memberId: string) => {
  return useQuery({
    queryKey: ["member", workspaceId, memberId],
    queryFn: () => membersApi.getMember(workspaceId, memberId),
    enabled: !!(workspaceId && memberId),
  });
};

// Get a single member with user data
export const useGetMemberWithUser = (workspaceId: string, memberId: string) => {
  return useQuery({
    queryKey: ["member", workspaceId, memberId, "with-user"],
    queryFn: () => membersApi.getMemberWithUser(workspaceId, memberId),
    enabled: !!(workspaceId && memberId),
  });
};

// Get member statistics
export const useGetMemberStats = (workspaceId: string) => {
  return useQuery({
    queryKey: ["memberStats", workspaceId],
    queryFn: () => membersApi.getMemberStats(workspaceId),
    enabled: !!workspaceId,
  });
};

// Update member role
export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      memberId,
      data,
    }: {
      workspaceId: string;
      memberId: string;
      data: UpdateMemberRoleData;
    }) => membersApi.updateMemberRole(workspaceId, memberId, data),
    onSuccess: (updatedMember, variables) => {
      // Update the specific member cache
      queryClient.setQueryData<MemberEntity>(
        ["member", variables.workspaceId, variables.memberId],
        updatedMember
      );

      // Update the member in the members list
      queryClient.setQueryData<MemberEntity[]>(
        ["members", variables.workspaceId],
        (old) =>
          old?.map((member) =>
            member.id === variables.memberId ? updatedMember : member
          ) || []
      );

      // Update member with user data caches
      queryClient.setQueryData<MemberWithUser[]>(
        ["members", variables.workspaceId, "with-users"],
        (old) =>
          old?.map((member) =>
            member.id === variables.memberId
              ? { ...member, ...updatedMember }
              : member
          ) || []
      );

      // If this is the current member, update that cache too
      queryClient.setQueryData<MemberWithUser>(
        ["currentMember", variables.workspaceId],
        (old) =>
          old?.id === variables.memberId ? { ...old, ...updatedMember } : old
      );
    },
  });
};

// Remove a member
export const useRemoveMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      memberId,
    }: {
      workspaceId: string;
      memberId: string;
    }) => membersApi.removeMember(workspaceId, memberId),
    onSuccess: (_, variables) => {
      // Remove from all members list caches
      queryClient.setQueryData<MemberEntity[]>(
        ["members", variables.workspaceId],
        (old) => old?.filter((member) => member.id !== variables.memberId) || []
      );

      queryClient.setQueryData<MemberWithUser[]>(
        ["members", variables.workspaceId, "with-users"],
        (old) => old?.filter((member) => member.id !== variables.memberId) || []
      );

      // Remove the specific member caches
      queryClient.removeQueries({
        queryKey: ["member", variables.workspaceId, variables.memberId],
      });

      // Invalidate member stats
      queryClient.invalidateQueries({
        queryKey: ["memberStats", variables.workspaceId],
      });
    },
  });
};

// Invite member
export const useInviteMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: InviteMemberData;
    }) => membersApi.inviteMember(workspaceId, data),
    onSuccess: (_, variables) => {
      // Invalidate members list to refresh with potential new member
      queryClient.invalidateQueries({
        queryKey: ["members", variables.workspaceId],
      });

      // Invalidate member stats
      queryClient.invalidateQueries({
        queryKey: ["memberStats", variables.workspaceId],
      });
    },
  });
};

// Bulk update member roles
export const useBulkUpdateMemberRoles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: BulkUpdateMembersData;
    }) => membersApi.bulkUpdateMemberRoles(workspaceId, data),
    onSuccess: (_, variables) => {
      // Invalidate all member-related queries for this workspace
      queryClient.invalidateQueries({
        queryKey: ["members", variables.workspaceId],
      });
    },
  });
};

// Bulk remove members
export const useBulkRemoveMembers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: BulkRemoveMembersData;
    }) => membersApi.bulkRemoveMembers(workspaceId, data),
    onSuccess: (_, variables) => {
      // Invalidate all member-related queries for this workspace
      queryClient.invalidateQueries({
        queryKey: ["members", variables.workspaceId],
      });

      // Invalidate member stats
      queryClient.invalidateQueries({
        queryKey: ["memberStats", variables.workspaceId],
      });
    },
  });
};

// Leave workspace
export const useLeaveWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) => membersApi.leaveWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      // Clear all workspace-related data
      queryClient.removeQueries({
        queryKey: ["members", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["currentMember", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["channels", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["conversations", workspaceId],
      });
    },
  });
};
