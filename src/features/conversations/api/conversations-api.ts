import api from '@/lib/api/axios-client';
import type {
  AddConversationParticipantData,
  ConversationEntity,
  ConversationFilters,
  ConversationMemberResponse,
  ConversationResponse,
  ConversationWithMessagesAndMembers,
  CreateConversationData,
  CreateConversationResponse,
  GetConversationMessagesParams,
} from '../types';

export const conversationsApi = {
  /**
   * Get all conversations for a workspace
   */
  getConversations: async (
    workspaceId: string,
    filters?: Partial<ConversationFilters>,
  ): Promise<ConversationEntity[]> => {
    const params = new URLSearchParams();
    if (filters?.participant_user_id) {
      params.append('participant_user_id', filters.participant_user_id);
    }
    if (filters?.has_unread !== undefined) {
      params.append('has_unread', filters.has_unread.toString());
    }
    if (filters?.search_query) {
      params.append('search_query', filters.search_query);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<ConversationEntity[]>(
      `/workspaces/${workspaceId}/conversations${queryString}`,
    );

    return response;
  },

  /**
   * Get conversation by ID
   */
  getConversation: async (
    workspaceId: string,
    conversationId: string,
  ): Promise<ConversationEntity> => {
    const { data: response } = await api.get<ConversationResponse>(
      `/workspaces/${workspaceId}/conversations/${conversationId}`,
    );
    return response.data;
  },

  getConversationWithMessages: async (
    workspaceId: string,
    conversationId: string,
    params?: GetConversationMessagesParams,
  ): Promise<ConversationWithMessagesAndMembers> => {
    const searchParams = new URLSearchParams();

    if (params?.limit) {
      searchParams.append('limit', params.limit.toString());
    }
    if (params?.cursor) {
      searchParams.append('cursor', params.cursor);
    }
    if (params?.before) {
      searchParams.append('before', params.before);
    }

    const queryString = searchParams.toString();
    const url = `/workspaces/${workspaceId}/conversations/${conversationId}/messages${
      queryString ? `?${queryString}` : ''
    }`;

    const { data: response } = await api.get<ConversationWithMessagesAndMembers>(url);
    return response;
  },

  getConversationMembers: async (
    workspaceId: string,
    conversationId: string,
  ): Promise<ConversationMemberResponse[]> => {
    const { data: response } = await api.get<ConversationMemberResponse[]>(
      `/workspaces/${workspaceId}/conversations/${conversationId}/members`,
    );
    return response;
  },
  /**
   * Create new conversation
   */
  createConversation: async (
    workspaceId: string,
    data: CreateConversationData,
  ): Promise<CreateConversationResponse> => {
    const { data: response } = await api.post<CreateConversationResponse>(
      `/workspaces/${workspaceId}/conversations`,
      data,
    );
    return {
      ...response,
      workspace_id: workspaceId,
    };
  },

  /**
   * Delete conversation
   */
  deleteConversation: async (workspaceId: string, conversationId: string): Promise<void> => {
    await api.delete(`/workspaces/${workspaceId}/conversations/${conversationId}`);
  },

  /**
   * Add participant to conversation
   */
  addParticipant: async (
    workspaceId: string,
    conversationId: string,
    data: AddConversationParticipantData,
  ): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/conversations/${conversationId}/participants`, data);
  },

  /**
   * Remove participant from conversation
   */
  removeParticipant: async (
    workspaceId: string,
    conversationId: string,
    participantId: string,
  ): Promise<void> => {
    await api.delete(
      `/workspaces/${workspaceId}/conversations/${conversationId}/participants/${participantId}`,
    );
  },

  /**
   * Leave conversation
   */
  leaveConversation: async (workspaceId: string, conversationId: string): Promise<void> => {
    await api.post(`/workspaces/${workspaceId}/conversations/${conversationId}/leave`);
  },
};
