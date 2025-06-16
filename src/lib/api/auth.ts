import { AxiosResponse } from 'axios';
import { axiosInstance } from '../axios';

interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expiresAt: string;
}

interface SignUpData {
  email: string;
  password: string;
  name: string;
}

interface SignInData {
  email: string;
  password: string;
}

interface UpdateProfileData {
  name?: string;
  image?: string;
}

interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

interface ResetPasswordRequestData {
  email: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    session: Session;
    profile: User;
    message?: string;
  };
  error?: string;
}

interface CurrentUserResponse {
  success: boolean;
  data: {
    user: User;
  };
  error?: string;
}

export const authApi = {
  signUp: (data: SignUpData): Promise<AxiosResponse<AuthResponse>> => {
    return axiosInstance.post('/auth/sign-up', data);
  },

  signIn: (data: SignInData): Promise<AxiosResponse<AuthResponse>> => {
    return axiosInstance.post('/auth/sign-in', data);
  },

  signOut: (): Promise<AxiosResponse> => {
    return axiosInstance.post('/auth/sign-out');
  },

  refreshToken: (refreshToken: string): Promise<AxiosResponse<AuthResponse>> => {
    return axiosInstance.post('/auth/refresh', { refreshToken });
  },

  googleSignIn: (redirectTo: string): Promise<AxiosResponse<{ url: string }>> => {
    return axiosInstance.post('/auth/google', { redirectTo });
  },

  githubSignIn: (redirectTo: string): Promise<AxiosResponse<{ url: string }>> => {
    return axiosInstance.post('/auth/github', { redirectTo });
  },

  verifyEmail: (token: string): Promise<AxiosResponse<AuthResponse>> => {
    return axiosInstance.post('/auth/verify-email', { token });
  },

  updateProfile: (data: UpdateProfileData): Promise<AxiosResponse<AuthResponse>> => {
    return axiosInstance.patch('/auth/profile', data);
  },

  updatePassword: (data: UpdatePasswordData): Promise<AxiosResponse<AuthResponse>> => {
    return axiosInstance.patch('/auth/password', data);
  },

  resetPasswordRequest: (data: ResetPasswordRequestData): Promise<AxiosResponse<{ message: string }>> => {
    return axiosInstance.post('/auth/reset-password-request', data);
  },

  getCurrentUser: (): Promise<AxiosResponse<CurrentUserResponse>> => {
    return axiosInstance.get('/auth/current-user');
  },
}; 