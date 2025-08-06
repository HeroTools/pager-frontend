import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/auth-api';
import type { CurrentUser } from '@/features/auth/types';
import { authQueryKeys } from '../query-keys';

export const useCurrentUser = (workspaceId: string) => {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<CurrentUser>({
    queryKey: authQueryKeys.currentUser(),
    queryFn: () => authApi.getCurrentUser(workspaceId),
    enabled: !!workspaceId,
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors except 401
      const status = error?.response?.status;
      if (status && status >= 400 && status < 500 && status !== 401) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 8 * 60 * 60 * 1000, // 8 hours
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
};
