import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/features/auth/api/auth-api";
import type { AuthUser } from "@/features/auth/types";

export const useCurrentUser = () => {
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<AuthUser>({
    queryKey: ["current-user"],
    queryFn: authApi.getCurrentUser,
    retry: false,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
};

// If you need the other hook too, you can keep it
export const useGetCurrentUser = () => {
  return useQuery<AuthUser>({
    queryKey: ["currentUser"],
    queryFn: authApi.getCurrentUser,
  });
};
