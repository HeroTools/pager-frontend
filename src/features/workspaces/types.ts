import { Workspace, WorkspaceWithMembers, ApiResponse } from "@/types/database";
import { MemberWithUser } from "@/features/members";

// Use the database Workspace type directly
export type WorkspaceEntity = Workspace;

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
export type JoinWorkspaceData =
  | { workspace_id: string }
  | { invitation_token: string };

export interface WorkspaceResponseData extends WorkspaceEntity {
  is_member: boolean;
  members: MemberWithUser[];
  user_role: string;
}

// API Response types using the generic ApiResponse
export type WorkspaceResponse = ApiResponse<WorkspaceResponseData>;
export type WorkspacesResponse = ApiResponse<WorkspaceEntity[]>;
export type WorkspaceWithMembersResponse =
  ApiResponse<WorkspaceWithMembersList>;

// Workspace statistics
export interface WorkspaceStats {
  total_members: number;
  total_channels: number;
  total_messages: number;
  active_members_today: number;
}

// UI-specific types
export interface WorkspaceListItem extends WorkspaceEntity {
  member_count?: number;
  unread_count?: number;
  user_role?: "owner" | "admin" | "member";
  last_activity_at?: string;
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
