import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authApi } from '../api/auth-api';
import { AuthError, EnhancedAuthResponse, SignInData, InviteLinkResponse } from '../types';
import { WorkspaceEntity } from '@/features/workspaces/types';

export const useSignUp = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.signUp,
    onSuccess: (data: EnhancedAuthResponse) => {
      // Cache user data
      if (data.user) {
        queryClient.setQueryData(['user'], data.user);
      }

      // Cache profile data if available
      if (data.profile) {
        queryClient.setQueryData(['userProfile'], data.profile);
      }

      // Cache workspaces data
      if (data.workspaces) {
        queryClient.setQueryData(['workspaces'], data.workspaces);

        // Cache individual workspace data for faster navigation
        data.workspaces.forEach((workspace) => {
          queryClient.setQueryData(['workspace', workspace.id], workspace);
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

  return useMutation<EnhancedAuthResponse, AuthError, SignInData>({
    mutationFn: authApi.signIn,
    onSuccess: (data: EnhancedAuthResponse) => {
      // Cache user data
      if (data.user) {
        queryClient.setQueryData(['user'], data.user);
      }

      // Cache profile data if available
      if (data.profile) {
        queryClient.setQueryData(['userProfile'], data.profile);
      }

      // Cache workspaces data
      if (data.workspaces) {
        queryClient.setQueryData(['workspaces'], data.workspaces);

        // Cache individual workspace data for faster navigation
        data.workspaces.forEach((workspace) => {
          queryClient.setQueryData(['workspace', workspace.id], workspace);
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
function handlePostSignInRouting(
  data: EnhancedAuthResponse,
  router: ReturnType<typeof useRouter>,
): void {
  const { workspaces, defaultWorkspaceId } = data;

  if (!workspaces || workspaces.length === 0) {
    // No workspaces - redirect to onboarding
    router.push('/onboarding/create-workspace');
    return;
  }

  if (workspaces.length === 1) {
    // Single workspace - go directly there
    router.push(`/${workspaces[0].id}`);
    return;
  }

  if (defaultWorkspaceId) {
    // Multiple workspaces with a default - go to default
    router.push(`/${defaultWorkspaceId}`);
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
    mutationFn: ({ refreshToken }: { refreshToken: string }) => authApi.refreshToken(refreshToken),
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
    mutationFn: async (workspaceId: string) => {
      // Update user's last workspace preference
      await authApi.updateUserPreferences({ last_workspace_id: workspaceId });
    },
    onSuccess: (_, workspaceId) => {
      // Update cached user profile (if you have a profile cache)
      const currentProfile = queryClient.getQueryData(['userProfile']);
      if (currentProfile) {
        queryClient.setQueryData(['userProfile'], {
          ...currentProfile,
          last_workspace_id: workspaceId,
        });
      }

      // Update the specific workspace in your workspaces cache to reflect it as "last used"
      queryClient.setQueryData<WorkspaceEntity[]>(['workspaces'], (old) => {
        if (!old) return old;
        return old.map((workspace) =>
          workspace.id === workspaceId
            ? { ...workspace, last_accessed_at: new Date().toISOString() }
            : workspace,
        );
      });

      // Invalidate workspace-specific caches to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ['workspace', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['members', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['channels', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['currentMember', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ['notifications', workspaceId],
      });

      // Navigate to the workspace
      router.push(`/${workspaceId}`);
    },
    onError: (error) => {
      console.error('Failed to switch workspace:', error);
    },
  });
};

export const useInviteLink = () => {
  return useMutation<InviteLinkResponse, Error, string>({
    mutationFn: (workspaceId: string) => authApi.getInviteLink(workspaceId),
  });
};
