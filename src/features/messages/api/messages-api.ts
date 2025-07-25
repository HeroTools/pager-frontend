import api from '@/lib/api/axios-client';
import type {
  ChannelMessage,
  ChannelMessageWithRelations,
  CreateChannelMessageData,
  CreateConversationMessageData,
  GetMessageByIdResponse,
  MessageEntity,
  MessageFilters,
  MessageResponse,
  MessageSearchResponse,
  MessagesResponse,
  MessagesWithRelationsResponse,
  MessageThread,
  MessageWithAllRelations,
  MessageWithRelationsResponse,
  MessageWithUser,
  UpdateMessageData,
} from '../types';

export const messagesApi = {
  /**
   * Get messages for a channel with pagination
   */
  getChannelMessages: async (
    workspaceId: string,
    channelId: string,
    filters?: Partial<MessageFilters>,
  ): Promise<{
    messages: ChannelMessage[];
    has_more: boolean;
    next_cursor?: string;
  }> => {
    const params = new URLSearchParams();
    if (filters?.before) {
      params.append('before', filters.before);
    }
    if (filters?.after) {
      params.append('after', filters.after);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.search_query) {
      params.append('search_query', filters.search_query);
    }
    if (filters?.message_type) {
      params.append('message_type', filters.message_type);
    }
    if (filters?.has_attachments !== undefined) {
      params.append('has_attachments', filters.has_attachments.toString());
    }
    if (filters?.user_id) {
      params.append('user_id', filters.user_id);
    }

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<MessagesResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages${qs}`,
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
    filters?: Partial<MessageFilters>,
  ): Promise<{
    messages: ChannelMessageWithRelations[];
    has_more: boolean;
    next_cursor?: string;
  }> => {
    const params = new URLSearchParams();
    if (filters?.before) {
      params.append('before', filters.before);
    }
    if (filters?.after) {
      params.append('after', filters.after);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.search_query) {
      params.append('search_query', filters.search_query);
    }
    if (filters?.message_type) {
      params.append('message_type', filters.message_type);
    }
    if (filters?.has_attachments !== undefined) {
      params.append('has_attachments', filters.has_attachments.toString());
    }
    if (filters?.user_id) {
      params.append('user_id', filters.user_id);
    }
    params.append('include_relations', 'true');

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<MessagesWithRelationsResponse>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages${qs}`,
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
  getMessageById: async (workspaceId: string, messageId: string): Promise<MessageWithUser> => {
    const { data: response } = await api.get<GetMessageByIdResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}`,
    );
    return response.message;
  },

  /**
   * Get a specific message with relations
   */
  getMessageWithRelations: async (
    workspaceId: string,
    messageId: string,
  ): Promise<MessageWithAllRelations> => {
    const { data: response } = await api.get<MessageWithRelationsResponse>(
      `/workspaces/${workspaceId}/messages/${messageId}?include_relations=true`,
    );
    return response.data;
  },

  /**
   * Create a new message in a channel
   */
  createChannelMessage: async (
    workspaceId: string,
    channelId: string,
    data: CreateChannelMessageData,
  ): Promise<MessageWithUser> => {
    const { data: response } = await api.post<MessageWithUser>(
      `/workspaces/${workspaceId}/channels/${channelId}/messages`,
      data,
    );
    return response;
  },

  /**
   * Create a new message in a conversation
   */
  createConversationMessage: async (
    workspaceId: string,
    conversationId: string,
    data: CreateConversationMessageData,
  ): Promise<MessageWithUser> => {
    const { data: response } = await api.post<MessageWithUser>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
      data,
    );
    return response;
  },

  /**
   * Update a message
   */
  updateMessage: async (
    workspaceId: string,
    messageId: string,
    data: UpdateMessageData,
  ): Promise<{ messageId: string; updatedAt: string }> => {
    const { data: response } = await api.put<{ messageId: string; updatedAt: string }>(
      `/workspaces/${workspaceId}/messages/${messageId}`,
      data,
    );
    return response;
  },

  /**
   * Delete a message (soft delete)
   */
  deleteMessage: async (workspaceId: string, messageId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/messages/${messageId}`);
  },

  /**
   * Get message thread (parent message + replies)
   */
  getMessageReplies: async ({
    workspaceId,
    messageId,
    params,
  }: {
    workspaceId: string;
    messageId: string;
    params?: {
      limit?: number;
      cursor?: string;
      before?: string;
      after?: string;
      entity_type?: 'channel' | 'conversation';
      entity_id?: string;
      include_reactions?: string;
      include_attachments?: string;
    };
  }): Promise<MessageThread> => {
    const appendedParams = new URLSearchParams();
    if (params?.before) {
      appendedParams.append('before', params.before);
    }
    if (params?.after) {
      appendedParams.append('after', params.after);
    }
    if (params?.limit) {
      appendedParams.append('limit', params.limit.toString());
    }
    if (params?.entity_type) {
      appendedParams.append('entity_type', params.entity_type);
    }
    if (params?.entity_id) {
      appendedParams.append('entity_id', params.entity_id);
    }

    const qs = appendedParams.toString() ? `?${appendedParams.toString()}` : '';
    const { data: response } = await api.get<MessageThread>(
      `/workspaces/${workspaceId}/messages/${messageId}/replies${qs}`,
    );

    return response;
  },

  /**
   * Reply to a message (create threaded reply)
   */
  replyToMessage: async (
    workspaceId: string,
    parentMessageId: string,
    data: Omit<CreateChannelMessageData, 'parent_message_id'>,
  ): Promise<MessageEntity> => {
    const { data: response } = await api.post<MessageResponse>(
      `/workspaces/${workspaceId}/messages/${parentMessageId}/replies`,
      data,
    );
    return response.data;
  },

  /**
   * Search messages across workspace
   */
  searchMessages: async (
    workspaceId: string,
    query: string,
    filters?: Partial<MessageFilters>,
  ): Promise<MessageSearchResponse['data']> => {
    const params = new URLSearchParams();
    params.append('q', query);
    if (filters?.channel_id) {
      params.append('channel_id', filters.channel_id);
    }
    if (filters?.conversation_id) {
      params.append('conversation_id', filters.conversation_id);
    }
    if (filters?.message_type) {
      params.append('message_type', filters.message_type);
    }
    if (filters?.user_id) {
      params.append('user_id', filters.user_id);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }

    const qs = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<MessageSearchResponse>(
      `/workspaces/${workspaceId}/messages/search${qs}`,
    );
    return response.data;
  },
};
