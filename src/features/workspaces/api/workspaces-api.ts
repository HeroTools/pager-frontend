import { httpClient } from "@/lib/api/http-client";
import type {
  WorkspaceEntity,
  WorkspaceWithMembersList,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  JoinWorkspaceData,
  WorkspaceResponse,
  WorkspacesResponse,
  WorkspaceWithMembersResponse,
  WorkspaceStats,
  WorkspaceResponseData,
} from "../types";

export const workspacesApi = {
  /**
   * Get all workspaces for current user
   */
  getWorkspaces: async (): Promise<WorkspaceEntity[]> => {
    const response = await httpClient.get<WorkspacesResponse>(`/workspaces`);
    return response || [];
  },

  /**
   * Get workspace by ID
   */
  getWorkspace: async (id: string): Promise<WorkspaceResponseData> => {
    const response = await httpClient.get<WorkspaceResponse>(
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
    const response = await httpClient.get<WorkspaceWithMembersResponse>(
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
    const response = await httpClient.post<WorkspaceResponse>(
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
    const response = await httpClient.patch<WorkspaceResponse>(
      `/workspaces/${id}`,
      data
    );
    return response;
  },

  /**
   * Delete workspace
   */
  deleteWorkspace: async (id: string): Promise<void> => {
    await httpClient.delete(`/workspaces/${id}`);
  },

  /**
   * Get workspace statistics
   */
  getWorkspaceStats: async (id: string): Promise<WorkspaceStats> => {
    const response = await httpClient.get<{ data: WorkspaceStats }>(
      `/workspaces/${id}/stats`
    );
    return response.data;
  },

  /**
   * Leave workspace (current user leaves)
   */
  leaveWorkspace: async (id: string): Promise<void> => {
    await httpClient.post(`/workspaces/${id}/leave`);
  },
};
