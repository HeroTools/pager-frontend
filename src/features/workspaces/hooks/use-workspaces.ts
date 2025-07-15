import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { workspacesApi } from '../api/workspaces-api';
import type {
  CreateWorkspaceData,
  UpdateWorkspaceData,
  WorkspaceEntity,
  WorkspaceInviteInfoResponse,
  WorkspaceWithMembersList,
} from '../types';
import type { CurrentUser } from '@/features/auth';
import { authQueryKeys } from '@/features/auth/query-keys';
import { workspacesQueryKeys } from '@/features/workspaces/query-keys';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';

// Get all workspaces
export const useGetWorkspaces = () => {
  return useQuery({
    queryKey: workspacesQueryKeys.workspaces(),
    queryFn: () => workspacesApi.getWorkspaces(),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 4 * 60 * 60 * 1000,
  });
};

// Get a single workspace
export const useGetWorkspace = (id: string) => {
  return useQuery({
    queryKey: workspacesQueryKeys.workspace(id),
    queryFn: () => workspacesApi.getWorkspace(id),
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 2 * 60 * 60 * 1000,
  });
};

// Create a new workspace
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkspaceData) => workspacesApi.createWorkspace(data),
    onSuccess: (newWorkspace) => {
      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());
      if (!currentUser) {
        return;
      }
      const userId = currentUser.id;
      const workspaceEntity: WorkspaceEntity = {
        id: newWorkspace.id,
        name: newWorkspace.name,
        user_role: newWorkspace.role || 'member',
        user_id: userId,
        is_owner: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      queryClient.setQueryData<WorkspaceEntity[]>(workspacesQueryKeys.workspaces(), (old) => {
        return old ? [...old, workspaceEntity] : [workspaceEntity];
      });

      queryClient.setQueryData<WorkspaceEntity>(workspacesQueryKeys.workspace(newWorkspace.id), {
        ...workspaceEntity,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesQueryKeys.workspaces(),
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
        workspacesQueryKeys.workspace(updatedWorkspace.id),
        updatedWorkspace,
      );

      // Update the workspace in the workspaces list
      queryClient.setQueryData<WorkspaceEntity[]>(
        workspacesQueryKeys.workspaces(),
        (old) =>
          old?.map((workspace) =>
            workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace,
          ) || [],
      );

      // Update workspace with members cache
      queryClient.setQueryData<WorkspaceWithMembersList>(
        ['workspace', updatedWorkspace.id, 'members'],
        (old) => (old ? { ...old, ...updatedWorkspace } : old),
      );
    },
  });
};

// Delete a workspace
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  const { clearWorkspaceDrafts } = useDraftsStore();

  return useMutation({
    mutationFn: (id: string) => workspacesApi.deleteWorkspace(id),
    onSuccess: (_, workspaceId) => {
      clearWorkspaceDrafts(workspaceId);
      // Remove from workspaces list cache
      queryClient.setQueryData<WorkspaceEntity[]>(
        workspacesQueryKeys.workspaces(),
        (old) => old?.filter((workspace) => workspace.id !== workspaceId) || [],
      );

      // Remove all workspace-related caches
      queryClient.removeQueries({
        queryKey: ['workspace', workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ['members', workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ['channels', workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ['conversations', workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ['currentMember', workspaceId],
      });
      queryClient.removeQueries({
        queryKey: ['workspaceStats', workspaceId],
      });
    },
  });
};

/**
 * Fetch workspace info from invite token
 */
export function useWorkspaceFromInviteToken(token?: string) {
  return useQuery<WorkspaceInviteInfoResponse, Error>({
    queryKey: ['workspace-invite-info', token],
    queryFn: () => {
      if (!token) {
        throw new Error('No invite token provided');
      }
      return workspacesApi.getWorkspaceFromInviteToken(token);
    },
    enabled: !!token,
    retry: false,
  });
}
