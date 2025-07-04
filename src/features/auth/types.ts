import { User, UpdateEntityInput } from '@/types/database';
import { WorkspaceEntity } from '../workspaces/types';

// Auth-specific flow type (not database related)
export type SignInFlow = 'signIn' | 'signUp';

// Use the database User type directly
export type AuthUser = User;

// Core Entities
export interface CurrentUser extends User {
  role: string;
  workspace_member_id: string;
  last_workspace_id?: string;
  email_confirmed_at?: string;
}

// Auth-specific request types (these include fields not in the database)
export interface SignUpData {
  email: string;
  password: string; // Not stored in User table (handled by auth.users)
  name?: string;
  invite_token?: string;
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
  expires_at?: number;
  token_type?: string;
  user?: AuthUser;
}

// Auth state for React context
export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Enhanced auth API response types with workspace support
export interface AuthResponse {
  user: AuthUser;
  session?: AuthSession;
  profile?: UpdateProfileData;
  message?: string;
}

// Enhanced response that includes workspace data from sign-in
export interface AuthResponseWithWorkspaces extends AuthResponse {
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
    is_active: boolean;
    role: 'owner' | 'admin' | 'member' | 'guest';
    last_accessed_at?: string;
  }>;
  defaultWorkspaceId?: string;
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

// Error types
export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

// User preferences (for updating last workspace, etc.)
export interface UserPreferences {
  last_workspace_id?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
}

// Mutation hook types for better TypeScript support
export interface AuthMutationHook<TData = any, TVariables = any> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: AuthError | null;
  data?: TData;
  reset: () => void;
}

// Specific hook return types
export interface UseSignInReturn extends AuthMutationHook<AuthResponseWithWorkspaces, SignInData> {}
export interface UseSignUpReturn extends AuthMutationHook<SignUpResponse, SignUpData> {}

export interface UseSignOutReturn extends AuthMutationHook<void, void> {}

// Workspace-related types for auth context
export interface WorkspaceRole {
  workspaceId: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  permissions: string[];
}

// Extended auth context that includes workspace information
export interface ExtendedAuthState extends AuthState {
  workspaces: AuthResponseWithWorkspaces['workspaces'];
  currentWorkspaceId?: string;
  userRoles: WorkspaceRole[];
  hasWorkspaceAccess: (workspaceId: string, requiredRole?: string) => boolean;
}

export interface EnhancedAuthResponse extends AuthResponse {
  workspaces: WorkspaceEntity[];
  defaultWorkspaceId?: string;
  requires_email_confirmation: boolean;
}

// Invite link API response type
export interface InviteLinkResponse {
  token: string;
  expires_at: string;
  usage_count: number;
  max_uses: number;
  url: string;
}
