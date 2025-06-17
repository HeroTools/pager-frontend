import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "../api/auth-api";
import { AuthUser } from "../types";

export const useSignUp = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.signUp,
    onSuccess: () => {
      router.push("/workspace");
    },
  });
};

export const useSignIn = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.signIn,
    onSuccess: (data: { user: AuthUser }) => {
      // Cache user data if returned
      if (data.user) {
        queryClient.setQueryData(["user"], data.user);
      }
      router.push("/workspace");
    },
    onError: () => {
      router.push("/auth");
    },
  });
};

export const useSignOut = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => {
      // Clear all cached data on sign out
      queryClient.clear();
      router.push("/auth");
    },
    onError: () => {
      router.push("/auth");
    },
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: ({ refreshToken }: { refreshToken: string }) =>
      authApi.refreshToken(refreshToken),
  });
};

export const useGoogleSignIn = () => {
  return useMutation({
    mutationFn: ({ redirectTo }: { redirectTo: string }) =>
      authApi.googleSignIn(redirectTo),
  });
};

export const useGithubSignIn = () => {
  return useMutation({
    mutationFn: ({ redirectTo }: { redirectTo: string }) =>
      authApi.githubSignIn(redirectTo),
  });
};

export const useVerifyEmail = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: ({ token }: { token: string }) => authApi.verifyEmail(token),
    onSuccess: () => {
      router.push("/auth/sign-in");
    },
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
