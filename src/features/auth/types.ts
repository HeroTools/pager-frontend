import { User, UpdateEntityInput } from "@/types/database";

// Auth-specific flow type (not database related)
export type SignInFlow = "signIn" | "signUp";

// Use the database User type directly
export type AuthUser = User;

// Auth-specific request types (these include fields not in the database)
export interface SignUpData {
  email: string;
  password: string; // Not stored in User table (handled by auth.users)
  name?: string;
}

export interface SignInData {
  email: string;
  password: string; // Not stored in User table
}

// Profile update types - based on database User fields
export type UpdateProfileData = UpdateEntityInput<User>;

// Password change (auth-specific, not in User table)
export interface UpdatePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Auth session/context types
export interface AuthSession {
  access_token: string;
  refresh_token: string;
}

// Auth state for React context
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Auth API response types
export interface AuthResponse {
  user: AuthUser;
  session?: AuthSession;
  profile?: UpdateProfileData;
  message?: string;
}

export interface SignUpResponse extends AuthResponse {
  requiresVerification?: boolean;
}

// Form validation types (could be useful for form libraries)
export interface SignUpFormData extends SignUpData {
  confirmPassword?: string;
  termsAccepted?: boolean;
}

export interface SignInFormData extends SignInData {
  rememberMe?: boolean;
}
