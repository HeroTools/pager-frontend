import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth-api';
import type {
  AuthError,
  AuthResponse,
  CurrentUser,
  InviteLinkResponse,
  SignInData,
} from '../types';
import type { WorkspaceEntity } from '@/features/workspaces/types';
import { authQueryKeys } from '../query-keys';
import { workspacesQueryKeys } from '@/features/workspaces/query-keys';

export const useSignUp = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.signUp,
    onSuccess: (data: AuthResponse) => {
      // Cache user data
      if (data.user) {
        queryClient.setQueryData(authQueryKeys.currentUser(), data.user);
      }

      // Cache profile data if available
      if (data.profile) {
        queryClient.setQueryData(authQueryKeys.userProfile(), data.profile);
      }

      // Cache workspaces data
      if (data.workspaces) {
        queryClient.setQueryData(workspacesQueryKeys.workspaces(), data.workspaces);

        // Cache individual workspace data for faster navigation
        data.workspaces.forEach((workspace) => {
          queryClient.setQueryData(workspacesQueryKeys.workspace(workspace.id), workspace);
        });
      }

      // Intelligent routing based on workspaces
      handlePostSignInRouting(data, router);
    },
    onError: (error: AuthError) => {
      console.error('Sign up failed:', error);
      router.push('/auth');
    },
  });
};

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, AuthError, SignInData>({
    mutationFn: authApi.signIn,
    onSuccess: (data: AuthResponse) => {
      // Cache user data
      if (data.user) {
        queryClient.setQueryData(authQueryKeys.currentUser(), data.user);
      }

      // Cache profile data if available
      if (data.profile) {
        queryClient.setQueryData(authQueryKeys.userProfile(), data.profile);
      }

      // Cache workspaces data
      if (data.workspaces) {
        queryClient.setQueryData(workspacesQueryKeys.workspaces(), data.workspaces);

        // Cache individual workspace data for faster navigation
        data.workspaces.forEach((workspace) => {
          queryClient.setQueryData(workspacesQueryKeys.workspace(workspace.id), workspace);
        });
      }

      // Intelligent routing based on workspaces
      handlePostSignInRouting(data, router);
    },
    onError: (error: AuthError) => {
      console.error('Sign in failed:', error);
      router.push('/auth');
    },
  });
};

// Helper function to handle routing logic
function handlePostSignInRouting(data: AuthResponse, router: ReturnType<typeof useRouter>): void {
  const { workspaces, default_workspace_id } = data;

  if (!workspaces || workspaces.length === 0) {
    // No workspaces - redirect to onboarding
    router.push('/onboarding/create-workspace');
    return;
  }

  if (workspaces && workspaces.length === 1) {
    // Single workspace - go directly there
    router.push(`/${workspaces[0]?.id}`);
    return;
  }

  if (default_workspace_id) {
    // Multiple workspaces with a default - go to default
    router.push(`/${default_workspace_id}`);
    return;
  }

  // Multiple workspaces, no clear default - show selection
  router.push('/workspaces');
}

export const useSignOut = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => {
      // Clear all cached data on sign out
      queryClient.clear();
      router.push('/auth');
    },
    onError: () => {
      router.push('/auth');
    },
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: ({ refresh_token }: { refresh_token: string }) =>
      authApi.refreshToken(refresh_token),
  });
};

export const useUpdateProfile = () => {
  return useMutation({
    mutationFn: authApi.updateProfile,
  });
};

export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: authApi.updatePassword,
  });
};

export const useResetPasswordRequest = () => {
  return useMutation({
    mutationFn: authApi.resetPasswordRequest,
  });
};

export const useSwitchWorkspace = () => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, AuthError, string>({
    mutationFn: async (workspace_id: string) => {
      // Update user's last workspace preference
      await authApi.updateUserPreferences({ last_workspace_id: workspace_id });
    },
    onSuccess: (_, workspace_id) => {
      // Update cached user profile (if you have a profile cache)
      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());
      if (currentUser) {
        queryClient.setQueryData(authQueryKeys.currentUser(), {
          ...currentUser,
          last_workspace_id: workspace_id,
        });
      }

      // Update the specific workspace in your workspaces cache to reflect it as "last used"
      queryClient.setQueryData<WorkspaceEntity[]>(workspacesQueryKeys.workspaces(), (old) => {
        if (!old) {
          return old;
        }
        return old.map((workspace) =>
          workspace.id === workspace_id
            ? { ...workspace, last_accessed_at: new Date().toISOString() }
            : workspace,
        );
      });

      // Invalidate workspace-specific caches to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: workspacesQueryKeys.workspace(workspace_id),
      });
      queryClient.invalidateQueries({
        queryKey: ['members', workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['channels', workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations', workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['currentMember', workspace_id],
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications', workspace_id],
      });

      // Navigate to the workspace
      router.push(`/${workspace_id}`);
    },
    onError: (error) => {
      console.error('Failed to switch workspace:', error);
    },
  });
};

export const useInviteLink = () => {
  return useMutation<InviteLinkResponse, Error, string>({
    mutationFn: (workspace_id: string) => authApi.getInviteLink(workspace_id),
  });
};
