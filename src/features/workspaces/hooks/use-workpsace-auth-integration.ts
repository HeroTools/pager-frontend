import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useGetWorkspaces } from '@/features/workspaces/hooks/use-workspaces';
import type { WorkspaceEntity } from '@/features/workspaces/types';
import { workspacesApi } from '../api/workspaces-api';

/**
 * Hook that integrates auth state with workspace management
 * Provides workspace-aware routing and state management
 */
export const useWorkspaceAuthIntegration = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: workspaces = [], isLoading } = useGetWorkspaces();

  // Get the current workspace from URL or cache
  const getCurrentWorkspaceId = (): string | null => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const match = pathname.match(/\/workspace\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // Navigate to appropriate workspace based on available workspaces
  const navigateToWorkspace = (preferredWorkspaceId?: string) => {
    if (workspaces.length === 0) {
      router.push('/onboarding/create-workspace');
      return;
    }

    if (workspaces.length === 1) {
      router.push(`/${workspaces[0].id}`);
      return;
    }

    // Check if preferred workspace exists
    if (preferredWorkspaceId && workspaces.find((w) => w.id === preferredWorkspaceId)) {
      router.push(`/${preferredWorkspaceId}`);
      return;
    }

    // Find user's owned workspace or first workspace
    const ownedWorkspace = workspaces.find((w) => w.role === 'owner');
    const targetWorkspace = ownedWorkspace || workspaces[0];

    if (targetWorkspace) {
      router.push(`/${targetWorkspace.id}`);
    } else {
      router.push('/workspaces');
    }
  };

  // Update workspace access tracking
  const trackWorkspaceAccess = (workspaceId: string) => {
    queryClient.setQueryData<WorkspaceEntity[]>(['workspaces'], (old) => {
      if (!old) {
        return old;
      }
      return old.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, last_accessed_at: new Date().toISOString() }
          : workspace,
      );
    });
  };

  // Check if user has access to a specific workspace
  const hasWorkspaceAccess = (workspaceId: string): boolean => {
    return workspaces.some((w) => w.id === workspaceId);
  };

  // Get user's role in a specific workspace
  const getWorkspaceRole = (workspaceId: string): string | null => {
    const workspace = workspaces.find((w) => w.id === workspaceId);
    return workspace?.role || null;
  };

  // Get workspaces by role
  const getWorkspacesByRole = (role: 'owner' | 'admin' | 'member' | 'guest') => {
    return workspaces.filter((w) => w.role === role);
  };

  return {
    workspaces,
    isLoading,
    getCurrentWorkspaceId,
    navigateToWorkspace,
    trackWorkspaceAccess,
    hasWorkspaceAccess,
    getWorkspaceRole,
    getWorkspacesByRole,
  };
};

/**
 * Hook for handling workspace switching with proper cache management
 */
export const useWorkspaceSwitcher = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { trackWorkspaceAccess } = useWorkspaceAuthIntegration();

  const switchToWorkspace = async (workspaceId: string) => {
    try {
      // Track the workspace access
      trackWorkspaceAccess(workspaceId);

      // Prefetch workspace data if not already cached
      const cachedWorkspace = queryClient.getQueryData<WorkspaceEntity>(['workspace', workspaceId]);
      if (!cachedWorkspace) {
        await queryClient.prefetchQuery({
          queryKey: ['workspace', workspaceId],
          queryFn: () => workspacesApi.getWorkspace(workspaceId),
        });
      }

      // Navigate to the workspace
      router.push(`/${workspaceId}`);

      return true;
    } catch (error) {
      console.error('Failed to switch workspace:', error);
      return false;
    }
  };

  return {
    switchToWorkspace,
  };
};

/**
 * Hook for workspace-aware authentication checks
 */
export const useWorkspaceAuth = (requiredRole?: 'owner' | 'admin' | 'member' | 'guest') => {
  const { getCurrentWorkspaceId, hasWorkspaceAccess, getWorkspaceRole } =
    useWorkspaceAuthIntegration();

  const currentWorkspaceId = getCurrentWorkspaceId();
  const hasAccess = currentWorkspaceId ? hasWorkspaceAccess(currentWorkspaceId) : false;
  const userRole = currentWorkspaceId ? getWorkspaceRole(currentWorkspaceId) : null;

  // Role hierarchy: owner > admin > member > guest
  const roleHierarchy = { owner: 4, admin: 3, member: 2, guest: 1 };

  const hasRequiredRole =
    !requiredRole || !userRole
      ? false
      : roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole];

  return {
    currentWorkspaceId,
    hasAccess,
    userRole,
    hasRequiredRole,
    isAuthorized: hasAccess && hasRequiredRole,
  };
};
