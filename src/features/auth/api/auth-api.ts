import api from "@/lib/api/axios-client";
import { supabase } from "@/lib/supabase/client";
import type {
  SignUpData,
  SignInData,
  UpdateProfileData,
  UpdatePasswordData,
  AuthResponse,
  EnhancedAuthResponse,
  UserPreferences,
  InviteLinkResponse,
  CurrentUser,
} from "@/features/auth/types";
import { User } from "@supabase/supabase-js";

export const authApi = {
  /**
   * Sign up a new user
   */
  signUp: async (data: SignUpData): Promise<EnhancedAuthResponse> => {
    const { data: response } = await api.post<EnhancedAuthResponse>(
      "/auth/sign-up",
      data
    );

    console.log(response);

    // Store session from Lambda response if provided
    if (response.session) {
      await supabase.auth.setSession(response.session);
    }

    return response;
  },

  /**
   * Sign in an existing user
   */
  signIn: async (data: SignInData): Promise<AuthResponse> => {
    const { data: response } = await api.post<EnhancedAuthResponse>(
      "/auth/sign-in",
      data
    );

    console.log("Sign in response:", response);

    // Store session from Lambda response
    if (response.data.session) {
      await supabase.auth.setSession(response.data.session);
    }

    return response.data;
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    // Call Lambda to handle server-side cleanup
    try {
      await api.post("/auth/sign-out");
    } catch (error) {
      // Even if Lambda fails, clear local session
      console.warn("Lambda signout failed:", error);
    }

    await supabase.auth.signOut();
  },

  /**
   * Refresh the current session token
   */
  refreshToken: async (refreshToken: string) => {
    const { data: response } = await api.post<{ session: string }>(
      "/auth/refresh",
      { refresh_token: refreshToken }
    );

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
    const { data: response } = await api.put("/auth/profile", data);
    return response;
  },

  /**
   * Update user password
   */
  updatePassword: async (data: UpdatePasswordData) => {
    const { data: response } = await api.put("/auth/password", data);
    return response;
  },

  /**
   * Request password reset
   */
  resetPasswordRequest: async (email: string) => {
    const { data: response } = await api.post<{ success: boolean }>(
      "/auth/reset-password-request",
      { email }
    );
    return response;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string) => {
    const { data: response } = await api.post("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
    return response;
  },

  /**
   * Get current user from Lambda/database
   */
  getCurrentUser: async (workspaceId: string): Promise<CurrentUser> => {
    const { data: response } = await api.get<CurrentUser>(
      `/auth/user?workspaceId=${workspaceId}`
    );
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
    if (error) throw error;
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
    const { data: response } = await api.delete("/auth/account");

    await supabase.auth.signOut();

    return response;
  },

  updateUserPreferences: async (data: UserPreferences) => {
    const { data: response } = await api.patch("/auth/user-preferences", data);
    return response;
  },

  /**
   * Get workspace invite link
   */
  getInviteLink: async (workspaceId: string): Promise<InviteLinkResponse> => {
    const { data: response } = await api.post<{ success: boolean; data: InviteLinkResponse }>(
      "/auth/invite-link",
      { workspaceId }
    );
    return response.data;
  },
};
