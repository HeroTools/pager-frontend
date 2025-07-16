import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { agentsApi } from '../api/agents-api';
import { agentsQueryKeys } from '../query-keys';
import {
  AgentChatData,
  AgentConversationFilters,
  AgentConversationMessageFilters,
  AgentFilters,
} from '../types';

export const useChatAgent = () => {
  return useMutation({
    mutationFn: (data: AgentChatData) => agentsApi.chat(data),
    onSuccess: () => {
      console.log('Agent chat successful');
    },
    onError: (error) => {
      console.error('Failed to chat with agent:', error);
    },
  });
};

export const useAgents = (workspaceId: string, filters?: Partial<AgentFilters>) => {
  return useQuery({
    queryKey: agentsQueryKeys.agents(workspaceId),
    queryFn: () => agentsApi.getAgents(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

export const useConversationMessages = (
  workspaceId: string,
  conversationId: string,
  message: string,
  options?: {
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
    includeMetadata?: boolean;
  },
) => {
  return useQuery({
    queryKey: agentsQueryKeys.agentMessages(workspaceId, conversationId),
    queryFn: () => agentsApi.chat({ workspaceId, conversationId, message, stream: false }),
    enabled: !!workspaceId && !!conversationId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};

export const useAgentConversations = (
  workspaceId: string,
  agentId: string,
  filters?: Partial<AgentConversationFilters>,
) => {
  return useQuery({
    queryKey: ['agent-conversations', workspaceId, agentId, filters],
    queryFn: () => agentsApi.getAgentConversations(workspaceId, agentId, filters),
    enabled: !!workspaceId && !!agentId,
  });
};

export const useInfiniteAgentConversations = (
  workspaceId: string,
  agentId: string,
  filters?: Omit<AgentConversationFilters, 'cursor'>,
) => {
  return useInfiniteQuery({
    queryKey: ['agent-conversations-infinite', workspaceId, agentId, filters],
    queryFn: ({ pageParam }) =>
      agentsApi.getAgentConversations(workspaceId, agentId, {
        ...filters,
        cursor: pageParam, // pageParam is the cursor (timestamp)
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined;
    },
    enabled: !!workspaceId && !!agentId,
  });
};

export const useAgentConversationMessages = (
  workspaceId: string,
  agentId: string,
  conversationId: string,
  filters?: Partial<AgentConversationMessageFilters>,
) => {
  return useQuery({
    queryKey: ['agent-conversation-messages', workspaceId, agentId, conversationId, filters],
    queryFn: () =>
      agentsApi.getAgentConversationMessages(workspaceId, agentId, conversationId, filters),
    enabled: !!workspaceId && !!agentId && !!conversationId,
  });
};

// For infinite scrolling (loading older messages)
export const useInfiniteAgentConversationMessages = (
  workspaceId: string,
  agentId: string,
  conversationId: string,
  filters?: Omit<AgentConversationMessageFilters, 'cursor'>,
) => {
  return useInfiniteQuery({
    queryKey: [
      'agent-conversation-messages-infinite',
      workspaceId,
      agentId,
      conversationId,
      filters,
    ],
    queryFn: ({ pageParam }) =>
      agentsApi.getAgentConversationMessages(workspaceId, agentId, conversationId, {
        ...filters,
        cursor: pageParam,
      }),
    initialPageParam: undefined, // First page has no cursor
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined;
    },
    enabled: !!workspaceId && !!agentId && !!conversationId,
  });
};
