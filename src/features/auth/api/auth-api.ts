import api from '@/lib/api/axios-client';
import { supabase } from '@/lib/supabase/client';
import type {
  AuthResponse,
  CurrentUser,
  InviteLinkResponse,
  SignInData,
  SignUpData,
  UpdatePasswordData,
  UpdateProfileData,
  UserPreferences,
} from '@/features/auth/types';
import type { AuthSession, User } from '@supabase/supabase-js';

export const authApi = {
  /**
   * Sign up a new user
   */
  signUp: async (data: SignUpData): Promise<AuthResponse> => {
    const { data: response } = await api.post<AuthResponse>('/auth/sign-up', data);

    // Store session from Lambda response if provided
    if (response.session) {
      await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });
    }

    return response;
  },

  /**
   * Sign in an existing user
   */
  signIn: async (data: SignInData): Promise<AuthResponse> => {
    const { data: response } = await api.post<AuthResponse>('/auth/sign-in', data);

    console.log(response);

    // Store session from Lambda response
    if (response.session) {
      await supabase.auth.setSession({
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
      });
    }

    return response;
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    // Call Lambda to handle server-side cleanup
    try {
      await api.post('/auth/sign-out');
    } catch (error) {
      // Even if Lambda fails, clear local session
      console.warn('Lambda signout failed:', error);
    }

    await supabase.auth.signOut();
  },

  /**
   * Refresh the current session token
   */
  refreshToken: async (refresh_token: string) => {
    const { data: response } = await api.post<{ session: AuthSession }>('/auth/refresh', {
      refresh_token,
    });

    // Update local session
    if (response.session) {
      await supabase.auth.setSession(response.session);
    }

    return response;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileData) => {
    const { data: response } = await api.put('/auth/profile', data);
    return response;
  },

  /**
   * Update user password
   */
  updatePassword: async (data: UpdatePasswordData) => {
    const { data: response } = await api.put('/auth/password', data);
    return response;
  },

  /**
   * Request password reset
   */
  resetPasswordRequest: async (email: string) => {
    const { data: response } = await api.post<{ success: boolean }>(
      '/auth/reset-password-request',
      { email },
    );
    return response;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, new_password: string) => {
    const { data: response } = await api.post('/auth/reset-password', {
      token,
      new_password,
    });
    return response;
  },

  /**
   * Get current user from Lambda/database
   */
  getCurrentUser: async (workspace_id: string): Promise<CurrentUser> => {
    const { data: response } = await api.get<CurrentUser>(`/auth/user?workspaceId=${workspace_id}`);
    return response;
  },

  /**
   * Get current auth session (from Supabase client)
   */
  getSession: async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return session;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const session = await authApi.getSession();
      return !!session;
    } catch {
      return false;
    }
  },

  /**
   * Get user by ID (admin function)
   */
  getUserById: async (userId: string): Promise<User> => {
    const { data: response } = await api.get<User>(`/admin/users/${userId}`);
    return response;
  },

  /**
   * Delete user account
   */
  deleteAccount: async () => {
    const { data: response } = await api.delete('/auth/account');

    await supabase.auth.signOut();

    return response;
  },

  updateUserPreferences: async (data: UserPreferences) => {
    const { data: response } = await api.patch('/auth/user-preferences', data);
    return response;
  },

  /**
   * Get workspace invite link
   */
  getInviteLink: async (workspace_id: string): Promise<InviteLinkResponse> => {
    const { data: response } = await api.post<InviteLinkResponse>('/auth/invite-link', {
      workspaceId: workspace_id,
    });
    return response;
  },
};
