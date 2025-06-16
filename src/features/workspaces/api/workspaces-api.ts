import { AxiosResponse } from 'axios';
import { axiosInstance } from '@/lib/axios';

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}

export interface WorkspaceResponse {
  success: boolean;
  data: {
    workspace: Workspace;
  };
  error?: string;
}

export interface WorkspacesResponse {
  success: boolean;
  data: {
    workspaces: Workspace[];
  };
  error?: string;
}

export interface JoinCodeResponse {
  success: boolean;
  data: {
    joinCode: string;
  };
  error?: string;
}

export const workspacesApi = {
  getWorkspaces: (): Promise<AxiosResponse<WorkspacesResponse>> => {
    return axiosInstance.get('/workspaces');
  },

  getWorkspace: (id: string): Promise<AxiosResponse<WorkspaceResponse>> => {
    return axiosInstance.get(`/workspaces/${id}`);
  },

  createWorkspace: (data: CreateWorkspaceData): Promise<AxiosResponse<WorkspaceResponse>> => {
    return axiosInstance.post('/workspaces', data);
  },

  updateWorkspace: (id: string, data: Partial<CreateWorkspaceData>): Promise<AxiosResponse<WorkspaceResponse>> => {
    return axiosInstance.patch(`/workspaces/${id}`, data);
  },

  deleteWorkspace: (id: string): Promise<AxiosResponse> => {
    return axiosInstance.delete(`/workspaces/${id}`);
  },

  generateJoinCode: (id: string): Promise<AxiosResponse<JoinCodeResponse>> => {
    return axiosInstance.post(`/workspaces/${id}/join-code`);
  },

  joinWorkspace: (joinCode: string): Promise<AxiosResponse<WorkspaceResponse>> => {
    return axiosInstance.post('/workspaces/join', { joinCode });
  },
}; 