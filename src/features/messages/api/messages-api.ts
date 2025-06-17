import { httpClient } from "@/lib/api/http-client";
import type {
  MessageEntity,
  MessageWithAllRelations,
  ChannelMessage,
  ChannelMessageWithRelations,
  CreateChannelMessageData,
  UpdateMessageData,
  MessageResponse,
  MessagesResponse,
  MessageWithRelationsResponse,
  MessagesWithRelationsResponse,
  MessageThreadResponse,
  MessageSearchResponse,
  MessageFilters,
  AddReactionData,
  MessageThread,
  MessageWithUser,
  MessageWithUserResponse,
  CreateConversationMessageData,
} from "../types";

export const messagesApi = {
  /**
   * Get messages for a channel with pagination
   */
  getChannelMessages: async (
    workspaceId: string,
    channelId: string,
    filters?: Partial<MessageFilters>
  ): Promise<{
    messages: ChannelMessage[];
    has_more: boolean;
    next_cursor?: string;
  }> => {
    const params = new URLSearchParams();
    if (filters?.before) params.append("before", filters.before);
    if (filters?.after) params.append("after", filters.after);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.search_query)
      params.append("search_query", filters.search_query);
    if (filters?.message_type)
      params.append("message_type", filters.message_type);
    if (filters?.has_attachments !== undefined)
      params.append("has_attachments", filters.has_attachments.toString());
    if (filters?.user_id) params.append("user_id", filters.user_id);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<MessagesResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages${queryString}`
    );
    return response.data as {
      messages: ChannelMessage[];
      has_more: boolean;
      next_cursor?: string;
    };
  },

  /**
   * Get messages with relations (user, reactions, etc.)
   */
  getChannelMessagesWithRelations: async (
    workspaceId: string,
    channelId: string,
    filters?: Partial<MessageFilters>
  ): Promise<{
    messages: ChannelMessageWithRelations[];
    has_more: boolean;
    next_cursor?: string;
  }> => {
    const params = new URLSearchParams();
    if (filters?.before) params.append("before", filters.before);
    if (filters?.after) params.append("after", filters.after);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.search_query)
      params.append("search_query", filters.search_query);
    if (filters?.message_type)
      params.append("message_type", filters.message_type);
    if (filters?.has_attachments !== undefined)
      params.append("has_attachments", filters.has_attachments.toString());
    if (filters?.user_id) params.append("user_id", filters.user_id);
    params.append("include_relations", "true");

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<MessagesWithRelationsResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages${queryString}`
    );
    return response.data as {
      messages: ChannelMessageWithRelations[];
      has_more: boolean;
      next_cursor?: string;
    };
  },

  /**
   * Get a specific message
   */
  getMessage: async (
    workspaceId: string,
    messageId: string
  ): Promise<MessageEntity> => {
    const response = await httpClient.get<MessageResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}`
    );
    return response.data;
  },

  /**
   * Get a specific message with relations
   */
  getMessageWithRelations: async (
    workspaceId: string,
    messageId: string
  ): Promise<MessageWithAllRelations> => {
    const response = await httpClient.get<MessageWithRelationsResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}?include_relations=true`
    );
    return response.data;
  },

  /**
   * Create a new message in a channel
   */
  createChannelMessage: async (
    workspaceId: string,
    channelId: string,
    data: CreateChannelMessageData
  ): Promise<MessageWithUser> => {
    const response = await httpClient.post<MessageWithUserResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * Create a new message in a conversation
   */
  createConversationMessage: async (
    workspaceId: string,
    conversationId: string,
    data: CreateConversationMessageData
  ): Promise<MessageWithUser> => {
    const response = await httpClient.post<MessageWithUserResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * Update a message
   */
  updateMessage: async (
    workspaceId: string,
    messageId: string,
    data: UpdateMessageData
  ): Promise<MessageEntity> => {
    const response = await httpClient.patch<MessageResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a message (soft delete)
   */
  deleteMessage: async (
    workspaceId: string,
    messageId: string
  ): Promise<void> => {
    await httpClient.delete(`/workspaces/${workspaceId}/messages/${messageId}`);
  },

  /**
   * Get message thread (parent message + replies)
   */
  getMessageThread: async (
    workspaceId: string,
    messageId: string
  ): Promise<MessageThread> => {
    const response = await httpClient.get<MessageThreadResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}/thread`
    );
    return response.data;
  },

  /**
   * Reply to a message (create threaded reply)
   */
  replyToMessage: async (
    workspaceId: string,
    parentMessageId: string,
    data: Omit<CreateChannelMessageData, "parent_message_id">
  ): Promise<MessageEntity> => {
    const response = await httpClient.post<MessageResponse>(
      `/workspaces/${workspaceId}/messages/${parentMessageId}/replies`,
      data
    );
    return response.data;
  },

  /**
   * Add reaction to message
   */
  addReaction: async (
    workspaceId: string,
    messageId: string,
    data: AddReactionData
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/messages/${messageId}/reactions`,
      data
    );
  },

  /**
   * Remove reaction from message
   */
  removeReaction: async (
    workspaceId: string,
    messageId: string,
    reactionValue: string
  ): Promise<void> => {
    await httpClient.delete(
      `/workspaces/${workspaceId}/messages/${messageId}/reactions/${encodeURIComponent(
        reactionValue
      )}`
    );
  },

  /**
   * Search messages across workspace
   */
  searchMessages: async (
    workspaceId: string,
    query: string,
    filters?: Partial<MessageFilters>
  ): Promise<MessageSearchResponse["data"]> => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters?.channel_id) params.append("channel_id", filters.channel_id);
    if (filters?.conversation_id)
      params.append("conversation_id", filters.conversation_id);
    if (filters?.message_type)
      params.append("message_type", filters.message_type);
    if (filters?.user_id) params.append("user_id", filters.user_id);
    if (filters?.limit) params.append("limit", filters.limit.toString());

    const queryString = params.toString();
    const response = await httpClient.get<MessageSearchResponse>(
      `/workspaces/${workspaceId}/messages/search?${queryString}`
    );
    return response.data;
  },
};
