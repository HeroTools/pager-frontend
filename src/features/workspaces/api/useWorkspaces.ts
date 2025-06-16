import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspacesApi } from './workspaces-api';
import type { Workspace, CreateWorkspaceData, CreateWorkspaceResponse, CreateWorkspaceSuccessPayload } from './workspaces-api';

// Type guard to narrow CreateWorkspaceResponse to CreateWorkspaceSuccessPayload
function isCreateWorkspaceSuccessPayload(data: CreateWorkspaceResponse): data is CreateWorkspaceSuccessPayload {
  return (data as CreateWorkspaceSuccessPayload).workspaceId !== undefined;
}

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
  const queryClient = useQueryClient();
  return useMutation<Workspace, Error, CreateWorkspaceData>({
    mutationFn: async (data: CreateWorkspaceData) => {
      const response = await workspacesApi.createWorkspace(data);

      if (isCreateWorkspaceSuccessPayload(response.data)) {
        // Fetch the full workspace object using the ID
        const fullWorkspaceResponse = await workspacesApi.getWorkspace(response.data.workspaceId);
        return fullWorkspaceResponse.data.data.workspace;
      } else if ('error' in response.data && response.data.error) {
        throw new Error(response.data.error);
      }
      throw new Error("Failed to create workspace: Unexpected response structure.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
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