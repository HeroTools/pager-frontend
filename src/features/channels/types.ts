import {
  Channel,
  ChannelWithMembers,
  CreateEntityInput,
  UpdateEntityInput,
  ApiResponse,
  ChannelType,
} from "@/types/database";

// Use the database Channel type directly
export type ChannelEntity = Channel;

// Extended channel type with members (useful for channel lists)
export type ChannelWithMembersList = ChannelWithMembers;

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
export type ChannelWithMembersResponse = ApiResponse<ChannelWithMembersList>;

// Channel member management types
export interface AddChannelMemberData {
  workspace_member_id: string;
  role?: "admin" | "member";
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
