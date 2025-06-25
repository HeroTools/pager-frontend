import {
  Channel,
  CreateEntityInput,
  UpdateEntityInput,
  ApiResponse,
  ChannelType,
  Attachment,
} from "@/types/database";

// Use the database Channel type directly
export type ChannelEntity = Channel;

// Channel member response from API
export interface ChannelMemberResponse {
  channel_member_id: string;
  channel_role: string;
  workspace_member_id: string;
}

export interface ChannelMemberData {
  id: string;
  name: string;
  avatar?: string;
  role?: "admin" | "member";
  workspace_member_id: string;
  email: string;
}

// Create channel data - based on database fields plus UI-specific fields
export interface CreateChannelData extends CreateEntityInput<Channel> {
  description?: string;
}

// Update channel data
export type UpdateChannelData = UpdateEntityInput<Channel> & {
  description?: string;
};

// Channel-specific API response types using the generic ApiResponse
export type ChannelResponse = ApiResponse<ChannelEntity>;
export type ChannelsResponse = ApiResponse<ChannelEntity[]>;

// Channel member management types
export interface AddChannelMembersData {
  workspace_member_ids: string[];
}

export interface UpdateChannelMemberData {
  role?: "admin" | "member";
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
  member_role?: "admin" | "member";
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
  role?: "admin" | "member";
}

export interface MessageWithUser {
  id: string;
  body: string;
  attachment_id: string | null;
  workspace_member_id: string;
  workspace_id: string;
  channel_id: string;
  conversation_id: string | null;
  parent_message_id: string | null;
  thread_id: string | null;
  message_type: string;
  created_at: string;
  updated_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  attachments?: Attachment[];
  reactions?: Array<{
    id: string;
    value: string;
    count: number;
    users: Array<{
      id: string;
      name: string;
    }>;
  }>;
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
  limit?: number;
  cursor?: string;
  before?: string;
}
