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
export interface JoinWorkspaceData {
  join_code: string; // Using database field name
}

export interface WorkspaceResponseData extends WorkspaceEntity {
  is_member: boolean;
  members: MemberWithUser[];
}

// API Response types using the generic ApiResponse
export type WorkspaceResponse = ApiResponse<WorkspaceResponseData>;
export type WorkspacesResponse = ApiResponse<WorkspaceEntity[]>;
export type WorkspaceWithMembersResponse =
  ApiResponse<WorkspaceWithMembersList>;
export type JoinCodeResponse = ApiResponse<{ join_code: string }>;

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
