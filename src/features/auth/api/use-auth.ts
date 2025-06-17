import { useMutation, useQuery } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

export const useSignUp = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.signUp,
    onSuccess: () => {
      router.push('/auth/sign-in');
    },
  });
};

export const useSignIn = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.signIn,
    onSuccess: () => {
      router.push('/workspaces');
    },
  });
};

export const useSignOut = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: authApi.signOut,
    onSuccess: () => {
      router.push('/auth/sign-in');
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
      router.push('/auth/sign-in');
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

export const useGetCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authApi.getCurrentUser(),
  });
}; 