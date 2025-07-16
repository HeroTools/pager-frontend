import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { agentsApi } from '../api/agents-api';
import { agentsQueryKeys } from '../query-keys';
import { AgentConversationFilters, AgentConversationMessageFilters, AgentFilters } from '../types';

export const useAgents = (workspaceId: string, filters?: Partial<AgentFilters>) => {
  return useQuery({
    queryKey: agentsQueryKeys.agents(workspaceId),
    queryFn: () => agentsApi.getAgents(workspaceId, filters),
    enabled: !!workspaceId,
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
    queryKey: ['agent-conversations-infinite', workspaceId, agentId],
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
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
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
    queryKey: ['agent-conversation-messages-infinite', workspaceId, agentId, conversationId],
    queryFn: ({ pageParam }) =>
      agentsApi.getAgentConversationMessages(workspaceId, agentId, conversationId, {
        ...filters,
        limit: 50,
        cursor: pageParam,
      }),
    initialPageParam: undefined, // First page has no cursor
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined;
    },
    enabled: !!workspaceId && !!agentId && !!conversationId,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
