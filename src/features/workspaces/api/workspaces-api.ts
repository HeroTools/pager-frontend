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
  JoinCodeResponse,
  WorkspaceStats,
  WorkspaceResponseData,
} from "../types";

export const workspacesApi = {
  /**
   * Get all workspaces for current user
   */
  getWorkspaces: async (): Promise<WorkspaceEntity[]> => {
    const response = await httpClient.get<WorkspacesResponse>(`/workspaces`);
    return response.data;
  },

  /**
   * Get workspace by ID
   */
  getWorkspace: async (id: string): Promise<WorkspaceResponseData> => {
    const response = await httpClient.get<WorkspaceResponse>(
      `/workspaces/${id}?include_details=false`
    );
    return response.data;
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
    return response.data;
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
    return response.data;
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
    return response.data;
  },

  /**
   * Delete workspace
   */
  deleteWorkspace: async (id: string): Promise<void> => {
    await httpClient.delete(`/workspaces/${id}`);
  },

  /**
   * Generate new join code for workspace
   */
  generateJoinCode: async (id: string): Promise<string> => {
    const response = await httpClient.post<JoinCodeResponse>(
      `/workspaces/${id}/join-code`
    );
    return response.data.join_code;
  },

  /**
   * Join workspace using join code
   */
  joinWorkspace: async (data: JoinWorkspaceData): Promise<WorkspaceEntity> => {
    const response = await httpClient.post<WorkspaceResponse>(
      "/workspaces/join",
      data
    );
    return response.data;
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
