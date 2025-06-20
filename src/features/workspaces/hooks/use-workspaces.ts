import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "../api/workspaces-api";
import type {
  WorkspaceEntity,
  WorkspaceWithMembersList,
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceInviteInfoResponse,
} from "../types";

// Get all workspaces
export const useGetWorkspaces = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.getWorkspaces(),
  });
};

// Get a single workspace
export const useGetWorkspace = (id: string) => {
  return useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspacesApi.getWorkspace(id),
    enabled: !!id,
  });
};

// Get workspace with members
export const useGetWorkspaceWithMembers = (id: string) => {
  return useQuery({
    queryKey: ["workspace", id, "members"],
    queryFn: () => workspacesApi.getAllWorkspaceDataForMember(id),
    enabled: !!id,
  });
};

// Get workspace statistics
export const useGetWorkspaceStats = (id: string) => {
  return useQuery({
    queryKey: ["workspaceStats", id],
    queryFn: () => workspacesApi.getWorkspaceStats(id),
    enabled: !!id,
  });
};

// Create a new workspace
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceData) =>
      workspacesApi.createWorkspace(data),
    onSuccess: (newWorkspace) => {
      // Add the new workspace to the cache
      queryClient.setQueryData<WorkspaceEntity[]>(["workspaces"], (old) =>
        old ? [...old, newWorkspace] : [newWorkspace]
      );

      // Cache the individual workspace
      queryClient.setQueryData<WorkspaceEntity>(
        ["workspace", newWorkspace.id],
        newWorkspace
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["workspaces"],
      });
    },
  });
};

// Update workspace settings
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceData }) =>
      workspacesApi.updateWorkspace(id, data),
    onSuccess: (updatedWorkspace) => {
      // Update the specific workspace cache
      queryClient.setQueryData<WorkspaceEntity>(
        ["workspace", updatedWorkspace.id],
        updatedWorkspace
      );

      // Update the workspace in the workspaces list
      queryClient.setQueryData<WorkspaceEntity[]>(
        ["workspaces"],
        (old) =>
          old?.map((workspace) =>
            workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
          ) || []
      );

      // Update workspace with members cache
      queryClient.setQueryData<WorkspaceWithMembersList>(
        ["workspace", updatedWorkspace.id, "members"],
        (old) => (old ? { ...old, ...updatedWorkspace } : old)
      );
    },
  });
};

// Delete a workspace
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspacesApi.deleteWorkspace(id),
    onSuccess: (_, workspaceId) => {
      // Remove from workspaces list cache
      queryClient.setQueryData<WorkspaceEntity[]>(
        ["workspaces"],
        (old) => old?.filter((workspace) => workspace.id !== workspaceId) || []
      );

      // Remove all workspace-related caches
      queryClient.removeQueries({
        queryKey: ["workspace", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["members", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["channels", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["conversations", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["currentMember", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["workspaceStats", workspaceId],
      });
    },
  });
};

// Leave workspace
export const useLeaveWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspacesApi.leaveWorkspace(id),
    onSuccess: (_, workspaceId) => {
      // Remove from workspaces list
      queryClient.setQueryData<WorkspaceEntity[]>(
        ["workspaces"],
        (old) => old?.filter((workspace) => workspace.id !== workspaceId) || []
      );

      // Clear all workspace-related data
      queryClient.removeQueries({
        queryKey: ["workspace", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["members", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["channels", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["conversations", workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ["currentMember", workspaceId],
      });
    },
  });
};

/**
 * Fetch workspace info from invite token
 */
export function useWorkspaceFromInviteToken(token?: string) {
  return useQuery<WorkspaceInviteInfoResponse, Error>({
    queryKey: ["workspace-invite-info", token],
    queryFn: () => {
      if (!token) throw new Error("No invite token provided");
      return workspacesApi.getWorkspaceFromInviteToken(token);
    },
    enabled: !!token,
    retry: false,
  });
}
