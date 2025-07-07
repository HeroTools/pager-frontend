import type { UpdateEntityInput, User } from '@/types/database';

export type SignInFlow = 'signIn' | 'signUp';

export type AuthUser = User;

export interface CurrentUser extends User {
  role: string;
  workspace_member_id: string;
  last_workspace_id?: string;
  email_confirmed_at?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
  inviteToken?: string | undefined;
}

export interface SignInData {
  email: string;
  password: string;
}

export type UpdateProfileData = UpdateEntityInput<User>;

export interface UpdatePasswordData {
  current_password: string;
  new_password: string;
}

// Updated to match backend AuthSession interface
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type?: string;
}

export interface AuthState {
  user: AuthUser | null;
  is_loading: boolean;
  is_authenticated: boolean;
}

// Updated to match backend AuthResponse interface
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name?: string;
    email_confirmed_at?: string | null;
    created_at: string;
    updated_at?: string;
    user_metadata?: Record<string, unknown>;
  };
  session: AuthSession;
  profile: {
    id: string;
    email: string;
    name?: string;
    avatar?: string;
    last_workspace_id?: string;
    preferences?: UserPreferences;
    created_at: string;
    updated_at: string;
  };
  workspaces: Array<{
    id: string;
    name: string;
    image?: string;
    description?: string;
    is_active: boolean;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    settings?: {
      is_public?: boolean;
      allow_invites?: boolean;
      default_role?: string;
    };
    created_at: string;
    updated_at: string;
  }>;
  default_workspace_id?: string;
  message?: string;
  is_new_user?: boolean;
  requires_email_confirmation?: boolean;
}

// API wrapper response
export interface ApiAuthResponse {
  success: boolean;
  data: AuthResponse;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    request_id?: string;
  };
}

export interface SignUpFormData extends SignUpData {
  confirm_password?: string;
  terms_accepted?: boolean;
}

export interface SignInFormData extends SignInData {
  remember_me?: boolean;
}

export interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

export interface UserPreferences {
  last_workspace_id?: string;
  theme?: 'light' | 'dark' | 'system';
  notifications_enabled?: boolean;
  timezone?: string;
  language?: string;
}

export interface AuthMutationHook<TData = unknown, TVariables = unknown> {
  mutate: (variables: TVariables) => void;
  mutate_async: (variables: TVariables) => Promise<TData>;
  is_pending: boolean;
  is_success: boolean;
  is_error: boolean;
  error: AuthError | null;
  data?: TData;
  reset: () => void;
}

export interface WorkspaceRole {
  workspace_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: string[];
}

export interface ExtendedAuthState extends AuthState {
  workspaces: AuthResponse['workspaces'];
  current_workspace_id?: string;
  user_roles: WorkspaceRole[];
  has_workspace_access: (workspace_id: string, required_role?: string) => boolean;
}

export interface InviteLinkResponse {
  token: string;
  expires_at: string;
  usage_count: number;
  max_uses: number;
  url: string;
}
