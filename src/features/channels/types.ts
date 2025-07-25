import type { ApiResponse, Channel, ChannelMemberRole, ChannelType } from '@/types/database';
import { MemberWithUser } from '../members';
import type { MessageWithUser } from '../messages/types';

export type { Channel };

// Use the database Channel type directly
export type ChannelEntity = Channel;

// Channel member response from API
export interface ChannelMemberResponse {
  channel_member_id: string;
  channel_role: ChannelMemberRole;
  workspace_member_id: string;
  joined_at: string;
  left_at: string;
  last_read_message_id: string;
  notifications_enabled: boolean;
  channel_id: string;
}

export type WorkspaceMemberWithoutId = Omit<MemberWithUser, 'id'>;
export type ChannelMember = WorkspaceMemberWithoutId & ChannelMemberResponse;

export interface ChannelMemberData {
  id: string;
  name: string;
  avatar?: string;
  role?: ChannelMemberRole;
  workspace_member_id: string;
  email: string;
}

// Create channel data - based on database fields plus UI-specific fields
export interface CreateChannelData {
  workspaceId: string;
  name: string;
  channelType: ChannelType;
  description?: string;
}

// Update channel data - matches backend API expectations
export interface UpdateChannelData {
  name?: string;
  channel_type?: ChannelType;
  description?: string;
}

// Channel-specific API response types using the generic ApiResponse
export type ChannelResponse = ApiResponse<ChannelEntity>;

// Channel member management types
export interface AddChannelMembersData {
  memberIds: string[];
}

export interface UpdateChannelMemberData {
  role?: ChannelMemberRole;
  notifications_enabled?: boolean;
}

// Channel filtering and search
export interface ChannelFilters {
  workspace_id: string;
  channel_type?: ChannelType;
  search_query?: string;
  member_id?: string;
}

// UI-specific types for channel management
export interface ChannelListItem extends ChannelEntity {
  unread_count?: number;
  last_message_at?: string;
  is_member?: boolean;
  member_role?: ChannelMemberRole;
}

// Form data types for UI components
export interface ChannelFormData {
  name: string;
  channel_type: ChannelType;
  description?: string;
}

// Channel invitation types
export interface ChannelInviteData {
  email: string;
  role?: 'admin' | 'member';
}

export interface ChannelMemberWithUser {
  id: string;
  channel_id: string;
  workspace_member_id: string;
  joined_at: string;
  role: string | null;
  notifications_enabled: boolean;
  last_read_message_id: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  status?: {
    status: string;
    custom_status: string | null;
    status_emoji: string | null;
    last_seen_at: string | null;
  };
}

export interface ChannelWithMessages {
  messages: MessageWithUser[];
  members: ChannelMemberWithUser[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

export type ChannelWithMessagesResponse = ApiResponse<ChannelWithMessages>;

export interface GetChannelMessagesParams {
  limit?: number | undefined;
  cursor?: string | undefined;
  before?: string | undefined;
}

export interface MutateCreateChannelContext {
  workspaceId: string;
  channelId?: string;
  previousChannels?: ChannelEntity[] | undefined;
}

export interface RemoveChannelMembersParams {
  workspaceId: string;
  channelId: string;
  channelMemberIds: string[];
  isCurrentUserLeaving?: boolean;
}
