import type {
  ApiResponse,
  Workspace,
  WorkspaceMemberRole,
  WorkspaceWithMembers,
} from '@/types/database';
import type { MemberWithUser } from '@/features/members';

// Use the database Workspace type directly
export interface WorkspaceEntity extends Workspace {
  user_role: WorkspaceMemberRole;
  is_owner: boolean;
}

// Extended workspace type with members
export type WorkspaceWithMembersList = WorkspaceWithMembers;

// Create workspace data - based on database fields
export interface CreateWorkspaceData {
  name: string;
  description?: string; // UI field not in database yet (you might want to add this to schema)
}

// Update workspace data
export type UpdateWorkspaceData = CreateWorkspaceData;

// Join workspace data
export type JoinWorkspaceData = { workspace_id: string } | { invitation_token: string };

export interface WorkspaceResponseData extends WorkspaceEntity {
  is_member: boolean;
  members: MemberWithUser[];
  user_role: WorkspaceMemberRole;
}

export interface CreateWorkspaceResponse {
  workspace_id: string;
  channel_id: string;
  member_id: string;
  message: string;
}

// Workspace statistics
export interface WorkspaceStats {
  total_members: number;
  total_channels: number;
  total_messages: number;
  active_members_today: number;
}

// Types for get-from-invite-token API
export interface WorkspaceInviteInfo {
  name: string;
  image?: string;
  is_active: boolean;
}

export interface WorkspaceInviteInfoResponse {
  workspace: WorkspaceInviteInfo;
}
