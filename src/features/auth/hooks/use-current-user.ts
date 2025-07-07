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
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 8 * 60 * 60 * 1000,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
};
