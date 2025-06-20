import { httpClient } from "@/lib/api/http-client";
import type {
  ConversationEntity,
  ConversationWithMembersList,
  ConversationMessage,
  ConversationMessageWithRelations,
  CreateConversationData,
  CreateConversationMessageData,
  UpdateConversationMessageData,
  AddConversationParticipantData,
  ConversationResponse,
  ConversationsResponse,
  ConversationWithMembersResponse,
  ConversationMessageResponse,
  ConversationMessagesResponse,
  ConversationFilters,
  ConversationMessageFilters,
  GetConversationMessagesParams,
  ConversationWithMessagesResponse,
  CreateConversationResponse,
} from "../types";

export const conversationsApi = {
  /**
   * Get all conversations for a workspace
   */
  getConversations: async (
    workspaceId: string,
    filters?: Partial<ConversationFilters>
  ): Promise<ConversationEntity[]> => {
    const params = new URLSearchParams();
    if (filters?.participant_user_id)
      params.append("participant_user_id", filters.participant_user_id);
    if (filters?.has_unread !== undefined)
      params.append("has_unread", filters.has_unread.toString());
    if (filters?.search_query)
      params.append("search_query", filters.search_query);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<ConversationsResponse>(
      `/workspaces/${workspaceId}/conversations${queryString}`
    );

    return response;
  },

  /**
   * Get conversation by ID
   */
  getConversation: async (
    workspaceId: string,
    conversationId: string
  ): Promise<ConversationEntity> => {
    const response = await httpClient.get<ConversationResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}`
    );
    return response.data;
  },

  getConversationWithMessages: async (
    workspaceId: string,
    conversationId: string,
    params?: GetConversationMessagesParams
  ): Promise<ConversationWithMessagesResponse> => {
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
    const url = `/workspaces/${workspaceId}/conversations/${conversationId}/messages${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await httpClient.get<ConversationWithMessagesResponse>(
      url
    );
    console.log(response);
    return response;
  },

  /**
   * Create new conversation
   */
  createConversation: async (
    workspaceId: string,
    data: CreateConversationData
  ): Promise<CreateConversationResponse> => {
    const response = await httpClient.post<CreateConversationResponse>(
      `/workspaces/${workspaceId}/conversations`,
      data
    );
    return {
      ...response,
      workspace_id: workspaceId,
    };
  },

  /**
   * Delete conversation
   */
  deleteConversation: async (
    workspaceId: string,
    conversationId: string
  ): Promise<void> => {
    await httpClient.delete(
      `/workspaces/${workspaceId}/conversations/${conversationId}`
    );
  },

  /**
   * Add participant to conversation
   */
  addParticipant: async (
    workspaceId: string,
    conversationId: string,
    data: AddConversationParticipantData
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/conversations/${conversationId}/participants`,
      data
    );
  },

  /**
   * Remove participant from conversation
   */
  removeParticipant: async (
    workspaceId: string,
    conversationId: string,
    participantId: string
  ): Promise<void> => {
    await httpClient.delete(
      `/workspaces/${workspaceId}/conversations/${conversationId}/participants/${participantId}`
    );
  },

  /**
   * Leave conversation
   */
  leaveConversation: async (
    workspaceId: string,
    conversationId: string
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/conversations/${conversationId}/leave`
    );
  },

  /**
   * Get messages for a conversation
   */
  getConversationMessages: async (
    workspaceId: string,
    conversationId: string,
    filters?: Partial<ConversationMessageFilters>
  ): Promise<ConversationMessage[]> => {
    const params = new URLSearchParams();
    if (filters?.before) params.append("before", filters.before);
    if (filters?.after) params.append("after", filters.after);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.search_query)
      params.append("search_query", filters.search_query);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<ConversationMessagesResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages${queryString}`
    );
    return response.data;
  },

  /**
   * Get messages with relations (user, reactions, etc.)
   */
  getConversationMessagesWithRelations: async (
    workspaceId: string,
    conversationId: string,
    filters?: Partial<ConversationMessageFilters>
  ): Promise<ConversationMessageWithRelations[]> => {
    const params = new URLSearchParams();
    if (filters?.before) params.append("before", filters.before);
    if (filters?.after) params.append("after", filters.after);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.search_query)
      params.append("search_query", filters.search_query);
    params.append("include_relations", "true");

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await httpClient.get<ConversationMessagesResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages${queryString}`
    );
    return response.data as ConversationMessageWithRelations[];
  },

  /**
   * Create new message in conversation
   */
  createMessage: async (
    workspaceId: string,
    conversationId: string,
    data: CreateConversationMessageData
  ): Promise<ConversationMessage> => {
    const response = await httpClient.post<ConversationMessageResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages`,
      data
    );
    return response.data;
  },

  /**
   * Update message
   */
  updateMessage: async (
    workspaceId: string,
    conversationId: string,
    messageId: string,
    data: UpdateConversationMessageData
  ): Promise<ConversationMessage> => {
    const response = await httpClient.patch<ConversationMessageResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages/${messageId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete message (soft delete)
   */
  deleteMessage: async (
    workspaceId: string,
    conversationId: string,
    messageId: string
  ): Promise<void> => {
    await httpClient.delete(
      `/workspaces/${workspaceId}/conversations/${conversationId}/messages/${messageId}`
    );
  },

  /**
   * Mark conversation as read
   */
  markAsRead: async (
    workspaceId: string,
    conversationId: string,
    messageId: string
  ): Promise<void> => {
    await httpClient.patch(
      `/workspaces/${workspaceId}/conversations/${conversationId}/read`,
      { last_read_message_id: messageId }
    );
  },

  /**
   * Get or create direct message conversation with another user
   */
  getOrCreateDirectMessage: async (
    workspaceId: string,
    participantUserId: string
  ): Promise<ConversationEntity> => {
    const response = await httpClient.post<ConversationResponse>(
      `/workspaces/${workspaceId}/conversations/direct`,
      { participant_user_id: participantUserId }
    );
    return response.data;
  },

  /**
   * Send typing indicator
   */
  sendTypingIndicator: async (
    workspaceId: string,
    conversationId: string,
    isTyping: boolean
  ): Promise<void> => {
    await httpClient.post(
      `/workspaces/${workspaceId}/conversations/${conversationId}/typing`,
      { is_typing: isTyping }
    );
  },
};
