import { useMutation, useQuery } from '@tanstack/react-query';
import { workspacesApi } from './workspaces-api';
import type { Workspace, CreateWorkspaceData } from './workspaces-api';

// Get all workspaces
export const useGetWorkspaces = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await workspacesApi.getWorkspaces();
      return response.data.data.workspaces;
    },
  });
};

// Get a single workspace
export const useGetWorkspace = (id: string) => {
  return useQuery({
    queryKey: ['workspace', id],
    queryFn: async () => {
      const response = await workspacesApi.getWorkspace(id);
      return response.data.data.workspace;
    },
    enabled: !!id,
  });
};

// Create a new workspace
export const useCreateWorkspace = () => {
  return useMutation({
    mutationFn: async (data: CreateWorkspaceData) => {
      const response = await workspacesApi.createWorkspace(data);
      return response.data.data.workspace;
    },
  });
};

// Generate a new join code
export const useNewJoinCode = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await workspacesApi.generateJoinCode(id);
      return response.data.data.joinCode;
    },
  });
};

// Join a workspace
export const useJoinWorkspace = () => {
  return useMutation({
    mutationFn: async (joinCode: string) => {
      const response = await workspacesApi.joinWorkspace(joinCode);
      return response.data.data.workspace;
    },
  });
};

// Update workspace settings
export const useUpdateWorkspace = () => {
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateWorkspaceData> }) => {
      const response = await workspacesApi.updateWorkspace(id, data);
      return response.data.data.workspace;
    },
  });
};

// Delete a workspace
export const useDeleteWorkspace = () => {
  return useMutation({
    mutationFn: async (id: string) => {
      await workspacesApi.deleteWorkspace(id);
    },
  });
}; 