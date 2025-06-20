import { createClient } from "@/lib/supabase/client";
import { httpClient } from "@/lib/api/http-client";
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
    const response = await httpClient.postPublic<EnhancedAuthResponse>(
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
  signIn: async (data: SignInData): Promise<EnhancedAuthResponse> => {
    const response = await httpClient.postPublic<EnhancedAuthResponse>(
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
      await httpClient.post("/auth/sign-out");
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
    const response = await httpClient.postPublic("/auth/refresh", {
      refresh_token: refreshToken,
    });

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
    const response = await httpClient.postPublic("/auth/oauth/google", {
      redirect_to: redirectTo,
    });

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
    return await httpClient.postPublic("/auth/verify-email", { token });
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileData) => {
    return await httpClient.put("/auth/profile", data);
  },

  /**
   * Update user password
   */
  updatePassword: async (data: UpdatePasswordData) => {
    return await httpClient.put("/auth/password", data);
  },

  /**
   * Request password reset
   */
  resetPasswordRequest: async (email: string) => {
    return await httpClient.postPublic("/auth/reset-password-request", {
      email,
    });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string) => {
    return await httpClient.postPublic("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
  },

  /**
   * Get current user from Lambda/database
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await httpClient.get("/auth/user");
    console.log(response);
    return response.profile as User;
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
    return await httpClient.get(`/admin/users/${userId}`);
  },

  /**
   * Delete user account
   */
  deleteAccount: async () => {
    const response = await httpClient.delete("/auth/account");

    // Clear local session after successful deletion
    const supabase = createClient();
    await supabase.auth.signOut();

    return response;
  },

  /**
   * Handle OAuth callback (for use in callback page)
   */
  handleOAuthCallback: async (code: string, state?: string) => {
    const response = await httpClient.postPublic("/auth/oauth/callback", {
      code,
      state,
    });

    // Store session from OAuth callback
    if (response.session) {
      const supabase = createClient();
      await supabase.auth.setSession(response.session);
    }

    return response;
  },

  updateUserPreferences: async (data: UserPreferences) => {
    const response = await httpClient.put("/auth/user-preferences", data);
    return response;
  },

  /**
   * Get workspace invite link
   */
  getInviteLink: async (workspaceId: string): Promise<InviteLinkResponse> => {
    const response = await httpClient.post<InviteLinkResponse>(
      "/auth/invite-link",
      { workspaceId }
    );
    return response;
  },
};
