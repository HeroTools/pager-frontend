import { httpClient } from "@/lib/api/http-client";
import type {
  MemberEntity,
  MemberWithUser,
  MemberResponse,
  MembersResponse,
  MembersWithUsersResponse,
  UpdateMemberRoleData,
  InviteMemberData,
  MemberFilters,
  BulkUpdateMembersData,
  BulkRemoveMembersData,
  MemberStats,
} from "../types";

export const membersApi = {
  /**
   * Get all members for a workspace
   */
  getMembers: async (
    workspaceId: string,
    filters?: Partial<MemberFilters>
  ): Promise<MemberWithUser[]> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.search_query)
      params.append("search_query", filters.search_query);
    if (filters?.active_only !== undefined)
      params.append("active_only", filters.active_only.toString());

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<MembersResponse>(
      `/workspaces/${workspaceId}/members${queryString}`
    );
    return response;
  },

  /**
   * Get all members with user data for a workspace
   */
  getMembersWithUsers: async (
    workspaceId: string,
    filters?: Partial<MemberFilters>
  ): Promise<MemberWithUser[]> => {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.search_query)
      params.append("search_query", filters.search_query);
    if (filters?.active_only !== undefined)
      params.append("active_only", filters.active_only.toString());
    params.append("include_users", "true");

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<MembersWithUsersResponse>(
      `/workspaces/${workspaceId}/members${queryString}`
    );
    return response;
  },

  /**
   * Get a specific member
   */
  getMember: async (
    workspaceId: string,
    memberId: string
  ): Promise<MemberEntity> => {
    const response = await httpClient.get<MemberResponse>(
      `/workspaces/${workspaceId}/members/${memberId}`
    );
    return response;
  },

  /**
   * Get a specific member with user data
   */
  getMemberWithUser: async (
    workspaceId: string,
    memberId: string
  ): Promise<MemberWithUser> => {
    const response = await httpClient.get<MemberResponse>(
      `/workspaces/${workspaceId}/members/${memberId}?include_user=true`
    );
    return response as MemberWithUser;
  },

  /**
   * Get current user's member record for a workspace
   */
  getCurrentMember: async (workspaceId: string): Promise<MemberWithUser> => {
    const response = await httpClient.get<MemberResponse>(
      `/workspaces/${workspaceId}/members/current`
    );

    return response as MemberWithUser;
  },

  /**
   * Update member role
   */
  updateMemberRole: async (
    workspaceId: string,
    memberId: string,
    data: UpdateMemberRoleData
  ): Promise<MemberEntity> => {
    const response = await httpClient.patch<MemberResponse>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      data
    );
    return response.data;
  },

  /**
   * Remove member from workspace
   */
  removeMember: async (
    workspaceId: string,
    memberId: string
  ): Promise<void> => {
    await httpClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  /**
   * Invite member to workspace
   */
  inviteMember: async (
    workspaceId: string,
    data: InviteMemberData
  ): Promise<void> => {
    await httpClient.post(`/workspaces/${workspaceId}/members/invite`, data);
  },

  /**
   * Bulk update member roles
   */
  bulkUpdateMemberRoles: async (
    workspaceId: string,
    data: BulkUpdateMembersData
  ): Promise<void> => {
    await httpClient.patch(
      `/workspaces/${workspaceId}/members/bulk-update`,
      data
    );
  },

  /**
   * Bulk remove members
   */
  bulkRemoveMembers: async (
    workspaceId: string,
    data: BulkRemoveMembersData
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/members/bulk-remove`,
      data
    );
  },

  /**
   * Get member statistics
   */
  getMemberStats: async (workspaceId: string): Promise<MemberStats> => {
    const response = await httpClient.get<{ data: MemberStats }>(
      `/workspaces/${workspaceId}/members/stats`
    );
    return response.data;
  },

  /**
   * Leave workspace (current user leaves)
   */
  leaveWorkspace: async (workspaceId: string): Promise<void> => {
    await httpClient.post(`/workspaces/${workspaceId}/leave`);
  },
};
