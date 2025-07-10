import type {
  ApiResponse,
  ChannelMemberRole,
  User,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberRole,
} from '@/types/database';

// Use the database types directly
export type UserEntity = User;
export type MemberEntity = WorkspaceMember;

// Extended member type with user data (matches your original structure)
export interface MemberWithUser extends MemberEntity {
  user: UserEntity;
}

// Extended member type with workspace data
export interface MemberWithWorkspace extends MemberEntity {
  workspace: Workspace;
}

// Full member with both user and workspace
export interface MemberWithRelations extends MemberEntity {
  user: UserEntity;
  workspace: Workspace;
}

export interface ChatMember {
  id: string; // conversation_member.id or channel_member.id
  joined_at: string;
  role: ChannelMemberRole;
  notifications_enabled: boolean;
  left_at: string | null;
  is_hidden: boolean;
  last_read_message_id?: string;
  workspace_member: MemberWithUser;
}

// Update member role data
export interface UpdateMemberRoleData {
  role: WorkspaceMemberRole; // 'admin' | 'member' from database enum
}

// Member invitation data
export interface InviteMemberData {
  email: string;
  role?: WorkspaceMemberRole;
}

// Member filtering and search
export interface MemberFilters {
  workspace_id: string;
  role?: WorkspaceMemberRole;
  search_query?: string;
  active_only?: boolean; // Filter out deactivated members if needed
}

// API Response types using the generic ApiResponse
export type MemberResponse = ApiResponse<MemberEntity>;
export type MembersResponse = ApiResponse<MemberWithUser[]>;
export type MemberWithUserResponse = ApiResponse<MemberWithUser>;
export type MembersWithUsersResponse = ApiResponse<MemberWithUser[]>;

// Member statistics for workspace dashboard
export interface MemberStats {
  total_members: number;
  admins_count: number;
  members_count: number;
  recent_joins: number; // Members joined in last 30 days
}

// Member activity data
export interface MemberActivity {
  member_id: string;
  last_seen_at?: string;
  message_count?: number;
  channel_count?: number;
}

// Bulk member operations
export interface BulkUpdateMembersData {
  member_ids: string[];
  role: WorkspaceMemberRole;
}

export interface BulkRemoveMembersData {
  member_ids: string[];
}

// Member profile data for workspace context
export interface WorkspaceMemberProfile extends MemberWithUser {
  status?: 'online' | 'away' | 'busy' | 'offline';
  custom_status?: string;
  channels_count?: number;
  conversations_count?: number;
  recent_activity?: MemberActivity;
}

// Member directory item (for member lists/directories)
export interface MemberDirectoryItem {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  role: WorkspaceMemberRole;
  joined_at: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  last_seen_at?: string;
  is_active: boolean;
}
