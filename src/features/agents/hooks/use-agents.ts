import { CurrentUser } from '@/features/auth';
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

export const useInfiniteAgentConversationMessages = (
  workspaceId: string,
  agentId: string,
  conversationId: string | null,
  currentUser: CurrentUser | null,
  isTempId: boolean,
  filters?: Omit<AgentConversationMessageFilters, 'cursor'>,
) => {
  return useInfiniteQuery({
    queryKey: ['agent-conversation-messages-infinite', workspaceId, agentId, conversationId],
    queryFn: ({ pageParam }) => {
      return agentsApi.getAgentConversationMessages(workspaceId, agentId, conversationId, {
        ...filters,
        limit: 50,
        cursor: pageParam,
      });
    },
    initialPageParam: undefined,
    initialData: isTempId
      ? {
          pages: [
            {
              conversation: null,
              agent: { id: agentId, name: '', avatar_url: null, is_active: true },
              messages: [],
              pagination: { hasMore: false, nextCursor: null, totalCount: 0 },
              user_conversation_data: {
                member_id: '',
                last_read_message_id: null,
                workspace_member_id: currentUser?.workspace_member_id || '',
              },
            },
          ],
          pageParams: [undefined],
        }
      : undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined;
    },
    // Disable query for temp IDs - rely on cache updates from mutations
    enabled: !!workspaceId && !!agentId && !!conversationId && !isTempId,
    staleTime: 1000 * 60 * 60 * 24,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
