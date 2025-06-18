import { httpClient } from "@/lib/api/http-client";
import type {
  ChannelEntity,
  ChannelWithMembersList,
  CreateChannelData,
  UpdateChannelData,
  ChannelResponse,
  ChannelsResponse,
  ChannelWithMembersResponse,
  AddChannelMemberData,
  UpdateChannelMemberData,
  ChannelFilters,
  ChannelWithMessages,
  GetChannelMessagesParams,
} from "@/features/channels/types";

export const channelsApi = {
  /**
   * Get all channels for a workspace
   */
  getChannels: async (
    workspaceId: string,
    filters?: Partial<ChannelFilters>
  ): Promise<ChannelEntity[]> => {
    const params = new URLSearchParams();
    if (filters?.channel_type)
      params.append("channel_type", filters.channel_type);
    if (filters?.search_query)
      params.append("search_query", filters.search_query);
    if (filters?.member_id) params.append("member_id", filters.member_id);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<ChannelsResponse>(
      `/workspaces/${workspaceId}/channels${queryString}`
    );
    return response || [];
  },

  /**
   * Get a specific channel
   */
  getChannel: async (
    workspaceId: string,
    channelId: string
  ): Promise<ChannelEntity> => {
    const response = await httpClient.get<ChannelEntity>(
      `/workspaces/${workspaceId}/channels/${channelId}`
    );
    return response;
  },

  /**
   * Get a channel with all messages
   */
  getChannelWithMessages: async (
    workspaceId: string,
    channelId: string,
    params?: GetChannelMessagesParams
  ): Promise<ChannelWithMessages> => {
    const searchParams = new URLSearchParams();

    if (params?.limit) {
      searchParams.append("limit", params.limit.toString());
    }
    if (params?.cursor) {
      searchParams.append("cursor", params.cursor);
    }
    if (params?.before) {
      searchParams.append("before", params.before);
    }

    const queryString = searchParams.toString();
    const url = `/workspaces/${workspaceId}/channels/${channelId}/messages${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await httpClient.get<ChannelWithMessages>(url);
    return response;
  },

  /**
   * Get a channel with its members
   */
  getChannelWithMembers: async (
    workspaceId: string,
    channelId: string
  ): Promise<ChannelWithMembersList> => {
    const response = await httpClient.get<ChannelWithMembersResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}/members`
    );
    return response;
  },

  /**
   * Create a new channel
   */
  createChannel: async (data: CreateChannelData): Promise<ChannelEntity> => {
    const response = await httpClient.post<ChannelEntity>(
      `/workspaces/${data.workspace_id}/channels`,
      data
    );
    return response;
  },

  /**
   * Update an existing channel
   */
  updateChannel: async (
    workspaceId: string,
    channelId: string,
    data: UpdateChannelData
  ): Promise<ChannelEntity> => {
    const response = await httpClient.patch<ChannelResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}`,
      data
    );
    return response;
  },

  /**
   * Delete a channel
   */
  deleteChannel: async (
    workspaceId: string,
    channelId: string
  ): Promise<void> => {
    await httpClient.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
  },

  /**
   * Join a channel
   */
  joinChannel: async (
    workspaceId: string,
    channelId: string
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/channels/${channelId}/join`
    );
  },

  /**
   * Leave a channel
   */
  leaveChannel: async (
    workspaceId: string,
    channelId: string
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/channels/${channelId}/leave`
    );
  },

  /**
   * Add a member to a channel
   */
  addChannelMember: async (
    workspaceId: string,
    channelId: string,
    data: AddChannelMemberData
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/channels/${channelId}/members`,
      data
    );
  },

  /**
   * Update a channel member's role or settings
   */
  updateChannelMember: async (
    workspaceId: string,
    channelId: string,
    memberId: string,
    data: UpdateChannelMemberData
  ): Promise<void> => {
    await httpClient.patch(
      `/workspaces/${workspaceId}/channels/${channelId}/members/${memberId}`,
      data
    );
  },

  /**
   * Remove a member from a channel
   */
  removeChannelMember: async (
    workspaceId: string,
    channelId: string,
    memberId: string
  ): Promise<void> => {
    await httpClient.delete(
      `/workspaces/${workspaceId}/channels/${channelId}/members/${memberId}`
    );
  },

  /**
   * Mark channel as read (update last_read_message_id)
   */
  markChannelAsRead: async (
    workspaceId: string,
    channelId: string,
    messageId: string
  ): Promise<void> => {
    await httpClient.patch(
      `/workspaces/${workspaceId}/channels/${channelId}/read`,
      { last_read_message_id: messageId }
    );
  },

  /**
   * Update notification settings for a channel
   */
  updateNotificationSettings: async (
    workspaceId: string,
    channelId: string,
    enabled: boolean
  ): Promise<void> => {
    await httpClient.patch(
      `/workspaces/${workspaceId}/channels/${channelId}/notifications`,
      { notifications_enabled: enabled }
    );
  },
};
