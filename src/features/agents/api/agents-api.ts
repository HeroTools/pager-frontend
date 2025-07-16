import api from '@/lib/api/axios-client';
import {
  AgentChatData,
  AgentConversationData,
  AgentConversationFilters,
  AgentConversationMessageFilters,
  AgentConversationsResponse,
  AgentEntity,
  AgentFilters,
} from '../types';

export const agentsApi = {
  /**
   * Chat with an agent
   */
  chat: async (data: AgentChatData): Promise<any> => {
    return await api.post(`/workspaces/${data.workspaceId}/agents/chat`, data);
  },

  getAgents: async (
    workspaceId: string,
    filters?: Partial<AgentFilters>,
  ): Promise<AgentEntity[]> => {
    const params = new URLSearchParams();

    if (filters?.include_inactive !== undefined) {
      params.append('include_inactive', filters.include_inactive.toString());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<AgentEntity[]>(
      `/workspaces/${workspaceId}/agents${queryString}`,
    );

    return response;
  },

  getAgentConversations: async (
    workspaceId: string,
    agentId: string,
    filters?: Partial<AgentConversationFilters>,
  ): Promise<AgentConversationsResponse> => {
    const params = new URLSearchParams();

    if (filters?.include_hidden !== undefined) {
      params.append('include_hidden', filters.include_hidden.toString());
    }
    if (filters?.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.cursor) {
      params.append('cursor', filters.cursor);
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<AgentConversationsResponse>(
      `/workspaces/${workspaceId}/agents/${agentId}/conversations${queryString}`,
    );

    return response;
  },

  getAgentConversationMessages: async (
    workspaceId: string,
    agentId: string,
    conversationId: string,
    filters?: Partial<AgentConversationMessageFilters>,
  ): Promise<AgentConversationData> => {
    const params = new URLSearchParams();

    if (filters?.limit !== undefined) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.cursor) {
      params.append('cursor', filters.cursor);
    }
    if (filters?.before) {
      params.append('before', filters.before);
    }
    if (filters?.include_reactions !== undefined) {
      params.append('include_reactions', filters.include_reactions.toString());
    }
    if (filters?.include_attachments !== undefined) {
      params.append('include_attachments', filters.include_attachments.toString());
    }
    if (filters?.include_count !== undefined) {
      params.append('include_count', filters.include_count.toString());
    }

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const { data: response } = await api.get<AgentConversationData>(
      `/workspaces/${workspaceId}/agents/${agentId}/conversations/${conversationId}/messages${queryString}`,
    );

    return response;
  },
};
