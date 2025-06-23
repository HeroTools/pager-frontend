import api from "@/lib/api/axios-client";
import { createClient } from "@/lib/supabase/client";
import type {
  SignUpData,
  SignInData,
  UpdateProfileData,
  UpdatePasswordData,
  AuthResponse,
  EnhancedAuthResponse,
  UserPreferences,
  InviteLinkResponse,
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
      const supabase = createClient();
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
      const supabase = createClient();
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

    // Always clear local session
    const supabase = createClient();
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
      const supabase = createClient();
      await supabase.auth.setSession(response.session);
    }

    return response;
  },

  /**
   * Sign in with Google
   */
  googleSignIn: async (redirectTo: string) => {
    const { data: response } = await api.post<{ url?: string }>(
      "/auth/oauth/google",
      { redirect_to: redirectTo }
    );

    // Handle OAuth URL redirection
    if (response.url) {
      window.location.href = response.url;
    }

    return response;
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string) => {
    const { data: response } = await api.post<{ success: boolean }>(
      "/auth/verify-email",
      { token }
    );
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
  getCurrentUser: async (): Promise<User> => {
    const { data: response } = await api.get<{ profile: User }>("/auth/user");
    console.log(response);
    return response.profile;
  },

  /**
   * Get current auth session (from Supabase client)
   */
  getSession: async () => {
    const supabase = createClient();
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

    // Clear local session after successful deletion
    const supabase = createClient();
    await supabase.auth.signOut();

    return response;
  },

  /**
   * Handle OAuth callback (for use in callback page)
   */
  handleOAuthCallback: async (code: string, state?: string) => {
    const { data: response } = await api.post<EnhancedAuthResponse>(
      "/auth/oauth/callback",
      { code, state }
    );

    // Store session from OAuth callback
    if (response.session) {
      const supabase = createClient();
      await supabase.auth.setSession(response.session);
    }

    return response;
  },

  updateUserPreferences: async (data: UserPreferences) => {
    const { data: response } = await api.put("/auth/user-preferences", data);
    return response;
  },

  /**
   * Get workspace invite link
   */
  getInviteLink: async (workspaceId: string): Promise<InviteLinkResponse> => {
    const { data: response } = await api.post<InviteLinkResponse>(
      "/auth/invite-link",
      { workspaceId }
    );
    return response;
  },
};
