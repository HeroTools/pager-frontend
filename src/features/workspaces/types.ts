import type { AgentEntity } from '@/features/agents/types';
import type { MemberWithUser } from '@/features/members';
import type { Workspace, WorkspaceMemberRole, WorkspaceWithMembers } from '@/types/database';

// Use the database Workspace type directly
export interface WorkspaceEntity extends Workspace {
  user_role: WorkspaceMemberRole;
  is_owner: boolean;
}

// Extended workspace type with members
export type WorkspaceWithMembersList = WorkspaceWithMembers;

export interface CreateWorkspaceData {
  name: string;
  agentName: string;
  description?: string;
}

// Update workspace data
export interface UpdateWorkspaceData {
  name?: string;
  agentName?: string;
  description?: string;
}

// Join workspace data
export type JoinWorkspaceData = { workspace_id: string } | { invitation_token: string };

export interface WorkspaceResponseData extends WorkspaceEntity {
  is_member: boolean;
  members: MemberWithUser[];
  user_role: WorkspaceMemberRole;
}

export interface CreateWorkspaceResponse {
  id: string;
  name: string;
  role: WorkspaceMemberRole;
  workspaceMemberId: string;
  defaultAgent: AgentEntity;
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
