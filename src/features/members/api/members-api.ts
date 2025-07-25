import api from '@/lib/api/axios-client';
import type {
  BulkRemoveMembersData,
  BulkUpdateMembersData,
  InviteMemberData,
  MemberEntity,
  MemberFilters,
  MemberResponse,
  MembersResponse,
  MemberStats,
  MembersWithUsersResponse,
  MemberWithUser,
  UpdateMemberRoleData,
} from '../types';

export const membersApi = {
  /**
   * Get all members for a workspace
   */
  getMembers: async (
    workspaceId: string,
    filters?: Partial<MemberFilters>,
  ): Promise<MemberWithUser[]> => {
    const params = new URLSearchParams();
    if (filters?.role) {
      params.append('role', filters.role);
    }
    if (filters?.search_query) {
      params.append('search_query', filters.search_query);
    }
    if (filters?.active_only !== undefined) {
      params.append('active_only', filters.active_only.toString());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<MemberWithUser[]>(
      `/workspaces/${workspaceId}/members${queryString}`,
    );
    return response;
  },

  /**
   * Get all members with user data for a workspace
   */
  getMembersWithUsers: async (
    workspaceId: string,
    filters?: Partial<MemberFilters>,
  ): Promise<MemberWithUser[]> => {
    const params = new URLSearchParams();
    if (filters?.role) {
      params.append('role', filters.role);
    }
    if (filters?.search_query) {
      params.append('search_query', filters.search_query);
    }
    if (filters?.active_only !== undefined) {
      params.append('active_only', filters.active_only.toString());
    }
    params.append('include_users', 'true');

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<MemberWithUser[]>(
      `/workspaces/${workspaceId}/members${queryString}`,
    );
    return response;
  },

  /**
   * Get a specific member
   */
  getMember: async (workspaceId: string, memberId: string): Promise<MemberWithUser> => {
    const { data: response } = await api.get<MemberWithUser>(
      `/workspaces/${workspaceId}/members/${memberId}`,
    );
    return response;
  },

  /**
   * Get a specific member with user data
   */
  getMemberWithUser: async (workspaceId: string, memberId: string): Promise<MemberWithUser> => {
    const { data: response } = await api.get<MemberWithUser>(
      `/workspaces/${workspaceId}/members/${memberId}?include_user=true`,
    );
    return response;
  },

  /**
   * Get current user's member record for a workspace
   */
  getCurrentMember: async (workspaceId: string): Promise<MemberWithUser> => {
    const { data: response } = await api.get<MemberWithUser>(
      `/workspaces/${workspaceId}/members/me/current`,
    );
    return response;
  },

  /**
   * Update member role
   */
  updateMemberRole: async (
    workspaceId: string,
    memberId: string,
    role: string,
  ): Promise<MemberWithUser> => {
    const { data: response } = await api.patch<MemberWithUser>(
      `/workspaces/${workspaceId}/members/${memberId}`,
      { role },
    );
    return response;
  },

  /**
   * Remove member from workspace
   */
  removeMember: async (workspaceId: string, memberId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  /**
   * Invite member to workspace
   */
  inviteMember: async (workspaceId: string, data: InviteMemberData): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/members/invite`, data);
  },

  /**
   * Bulk update member roles
   */
  bulkUpdateMemberRoles: async (
    workspaceId: string,
    data: BulkUpdateMembersData,
  ): Promise<void> => {
    await api.patch(`/workspaces/${workspaceId}/members/bulk-update`, data);
  },

  /**
   * Bulk remove members
   */
  bulkRemoveMembers: async (workspaceId: string, data: BulkRemoveMembersData): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/members/bulk-remove`, data);
  },

  /**
   * Get member statistics
   */
  getMemberStats: async (workspaceId: string): Promise<MemberStats> => {
    const { data: response } = await api.get<{ data: MemberStats }>(
      `/workspaces/${workspaceId}/members/stats`,
    );
    return response.data;
  },

  /**
   * Leave workspace (current user leaves)
   */
  leaveWorkspace: async (workspaceId: string): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/leave`);
  },
};
