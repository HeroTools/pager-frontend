import api from "@/lib/api/axios-client";
import type {
  ChannelEntity,
  CreateChannelData,
  UpdateChannelData,
  ChannelResponse,
  ChannelsResponse,
  AddChannelMembersData,
  UpdateChannelMemberData,
  ChannelFilters,
  ChannelWithMessages,
  GetChannelMessagesParams,
  ChannelMemberResponse,
} from "@/features/channels/types";

export const channelsApi = {
  /**
   * Get all channels for a workspace
   */
  getAllAvailableChannels: async (
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
    const { data: response } = await api.get<ChannelsResponse>(
      `/workspaces/${workspaceId}/channels/all-available${queryString}`
    );
    return response || [];
  },

  getUserChannels: async (
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
    const { data: response } = await api.get<ChannelsResponse>(
      `/workspaces/${workspaceId}/user/channels${queryString}`
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
    const { data: response } = await api.get<ChannelEntity>(
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
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.cursor) searchParams.append("cursor", params.cursor);
    if (params?.before) searchParams.append("before", params.before);

    const qs = searchParams.toString();
    const url = `/workspaces/${workspaceId}/channels/${channelId}/messages${
      qs ? `?${qs}` : ""
    }`;
    const { data: response } = await api.get<ChannelWithMessages>(url);
    return response;
  },

  /**
   * Create a new channel
   */
  createChannel: async (data: CreateChannelData): Promise<ChannelEntity> => {
    const { data: response } = await api.post<ChannelEntity>(
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
    const { data: response } = await api.patch<ChannelResponse>(
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
    await api.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
  },

  /**
   * Join a channel
   */
  joinChannel: async (
    workspaceId: string,
    channelId: string
  ): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/channels/${channelId}/join`);
  },

  /**
   * Add a member to a channel
   */
  addChannelMembers: async (
    workspaceId: string,
    channelId: string,
    data: AddChannelMembersData
  ): Promise<void> => {
    await api.post(
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
    await api.patch(
      `/workspaces/${workspaceId}/channels/${channelId}/members/${memberId}`,
      data
    );
  },

  /**
   * Remove members from a channel
   * @returns void - Returns nothing on success, throws error on failure
   */
  removeChannelMembers: async (
    workspaceId: string,
    channelId: string,
    channelMemberIds: string[]
  ): Promise<void> => {
    await api.delete(
      `/workspaces/${workspaceId}/channels/${channelId}/members`,
      { data: { channelMemberIds } }
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
    await api.patch(`/workspaces/${workspaceId}/channels/${channelId}/read`, {
      last_read_message_id: messageId,
    });
  },

  /**
   * Update notification settings for a channel
   */
  updateNotificationSettings: async (
    workspaceId: string,
    channelId: string,
    enabled: boolean
  ): Promise<void> => {
    await api.patch(
      `/workspaces/${workspaceId}/channels/${channelId}/notifications`,
      { notifications_enabled: enabled }
    );
  },

  /**
   * Get all members of a channel
   */
  getChannelMembers: async (
    workspaceId: string,
    channelId: string
  ): Promise<ChannelMemberResponse[]> => {
    const { data: response } = await api.get<ChannelMemberResponse[]>(
      `/workspaces/${workspaceId}/channels/${channelId}/members`
    );
    return response || [];
  },
};
