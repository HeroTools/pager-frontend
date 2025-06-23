import api from "@/lib/api/axios-client";
import type {
  WorkspaceEntity,
  WorkspaceWithMembersList,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceResponse,
  WorkspacesResponse,
  WorkspaceWithMembersResponse,
  WorkspaceStats,
  WorkspaceResponseData,
  WorkspaceInviteInfoResponse,
} from "../types";

export const workspacesApi = {
  /**
   * Get all workspaces for current user
   */
  getWorkspaces: async (): Promise<WorkspaceEntity[]> => {
    const { data: response } = await api.get<WorkspacesResponse>(`/workspaces`);
    return response || [];
  },

  /**
   * Get workspace by ID
   */
  getWorkspace: async (id: string): Promise<WorkspaceResponseData> => {
    const { data: response } = await api.get<WorkspaceResponse>(
      `/workspaces/${id}?include_details=false`
    );
    return response?.workspace;
  },

  /**
   * Get workspace with members
   */
  getAllWorkspaceDataForMember: async (
    id: string
  ): Promise<WorkspaceWithMembersList> => {
    const { data: response } = await api.get<WorkspaceWithMembersResponse>(
      `/workspaces/${id}?include_details=true`
    );
    return response;
  },

  /**
   * Create new workspace
   */
  createWorkspace: async (
    data: CreateWorkspaceData
  ): Promise<WorkspaceEntity> => {
    const { data: response } = await api.post<WorkspaceResponse>(
      "/workspaces",
      data
    );
    return response;
  },

  /**
   * Update workspace
   */
  updateWorkspace: async (
    id: string,
    data: UpdateWorkspaceData
  ): Promise<WorkspaceEntity> => {
    const { data: response } = await api.patch<WorkspaceResponse>(
      `/workspaces/${id}`,
      data
    );
    return response;
  },

  /**
   * Delete workspace
   */
  deleteWorkspace: async (id: string): Promise<void> => {
    await api.delete(`/workspaces/${id}`);
  },

  /**
   * Get workspace statistics
   */
  getWorkspaceStats: async (id: string): Promise<WorkspaceStats> => {
    const { data: response } = await api.get<{ data: WorkspaceStats }>(
      `/workspaces/${id}/stats`
    );
    return response.data;
  },

  /**
   * Leave workspace (current user leaves)
   */
  leaveWorkspace: async (id: string): Promise<void> => {
    await api.post(`/workspaces/${id}/leave`);
  },

  /**
   * Get workspace info from invite token
   */
  getWorkspaceFromInviteToken: async (
    token: string
  ): Promise<WorkspaceInviteInfoResponse> => {
    const { data: response } = await api.get<WorkspaceInviteInfoResponse>(
      `/workspaces/invite-token?token=${token}`
    );
    return response;
  },
};
