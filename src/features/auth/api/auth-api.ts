import { createClient } from "@/lib/supabase/client";
import { httpClient } from "@/lib/api/http-client";
import type {
  SignUpData,
  SignInData,
  UpdateProfileData,
  UpdatePasswordData,
  AuthResponse,
} from "@/features/auth/types";

export const authApi = {
  /**
   * Sign up a new user
   */
  signUp: async (data: SignUpData) => {
    const response = await httpClient.postPublic("/auth/sign-up", data);

    // If your Lambda returns Supabase session, store it
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
    const response = await httpClient.postPublic<AuthResponse>(
      "/auth/sign-in",
      data
    );
    console.log(response);
    // Store session from Lambda response
    if (response.session) {
      const supabase = createClient();
      await supabase.auth.setSession(response.session);
    }

    return response;
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
   * Sign in with GitHub
   */
  githubSignIn: async (redirectTo: string) => {
    const response = await httpClient.postPublic("/auth/oauth/github", {
      redirect_to: redirectTo,
    });

    if (response.url) {
      window.location.href = response.url;
    }

    return response;
  },

  /**
   * Verify email with token
   */
  verifyEmail: async (token: string) => {
    return httpClient.postPublic("/auth/verify-email", { token });
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: UpdateProfileData) => {
    return httpClient.put("/auth/profile", data);
  },

  /**
   * Update user password
   */
  updatePassword: async (data: UpdatePasswordData) => {
    return httpClient.put("/auth/password", data);
  },

  /**
   * Request password reset
   */
  resetPasswordRequest: async (email: string) => {
    return httpClient.postPublic("/auth/reset-password-request", { email });
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token: string, newPassword: string) => {
    return httpClient.postPublic("/auth/reset-password", {
      token,
      new_password: newPassword,
    });
  },

  /**
   * Get current user from Lambda/database
   */
  getCurrentUser: async (): Promise<User> => {
    return httpClient.get("/auth/user");
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
    return httpClient.get(`/admin/users/${userId}`);
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
};
