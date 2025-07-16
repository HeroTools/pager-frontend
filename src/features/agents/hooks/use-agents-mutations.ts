import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { agentsApi } from '@/features/agents/api/agents-api';
import {
  AgentChatData,
  AgentChatResponse,
  AgentConversationData,
  AgentMessageWithSender,
} from '@/features/agents/types';
import { authQueryKeys } from '@/features/auth/query-keys';
import { CurrentUser } from '@/features/auth/types';

interface AgentMessagesInfiniteData {
  pages: Array<AgentConversationData>;
  pageParams: (string | undefined)[];
}

interface AgentMessageMutationContext {
  previousMessages?: AgentMessagesInfiniteData;
  optimisticId?: string;
}

export const useCreateMessage = (workspaceId: string, agentId: string, conversationId: string) => {
  const queryClient = useQueryClient();

  const getInfiniteQueryKey = useCallback(
    () => ['agent-conversation-messages-infinite', workspaceId, agentId, conversationId] as const,
    [workspaceId, agentId, conversationId],
  );

  return useMutation<AgentChatResponse, Error, AgentChatData, AgentMessageMutationContext>({
    mutationKey: ['createAgentMessage', workspaceId, agentId, conversationId],

    // 1) call out to the API
    mutationFn: async (data) => {
      const response = await agentsApi.createMessage(data);
      console.log('Agent message created successfully:', response);
      return response;
    },

    // 2) optimistic update
    onMutate: async (data) => {
      const queryKey = getInfiniteQueryKey();
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<AgentMessagesInfiniteData>(queryKey);
      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());

      if (!currentUser) {
        console.error('No current user for optimistic agent message');
        return { previousMessages: previous };
      }

      const optimisticId = data._optimisticId || `temp-${Date.now()}-${Math.random()}`;
      const optimisticMsg: AgentMessageWithSender = {
        id: optimisticId,
        body: data.message,
        channel_id: null,
        conversation_id: conversationId,
        workspace_id: workspaceId,
        workspace_member_id: currentUser.workspace_member_id,
        ai_agent_id: null,
        parent_message_id: null,
        thread_id: null,
        message_type: 'direct',
        sender_type: 'user',
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        blocks: null,
        metadata: null,
        reactions: [],
        attachments: [],
        thread_reply_count: 0,
        thread_last_reply_at: null,
        thread_participants: [],
        _isOptimistic: true,
      } as AgentMessageWithSender & { _isOptimistic: boolean };

      console.log('optimisticMsg', optimisticMsg);
      console.log(queryKey);

      // insert into the first page
      queryClient.setQueryData<AgentMessagesInfiniteData>(queryKey, (old) => {
        if (!old?.pages?.length) {
          return {
            pages: [
              {
                conversation: {
                  id: conversationId,
                  workspace_id: workspaceId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  title: null,
                },
                agent: { id: agentId, name: '', avatar_url: null, is_active: true },
                messages: [optimisticMsg],
                pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
                user_conversation_data: {
                  member_id: '',
                  last_read_message_id: null,
                  workspace_member_id: currentUser.workspace_member_id,
                },
              },
            ],
            pageParams: [undefined],
          };
        }

        const newPages = [...old.pages];
        const firstPage = newPages[0];
        const messageExists = firstPage.messages.find((m) => m.id === optimisticMsg.id);

        if (messageExists) {
          return old;
        }

        newPages[0] = {
          ...firstPage,
          messages: [...firstPage.messages, optimisticMsg],
          pagination: {
            ...firstPage.pagination,
            totalCount: (firstPage.pagination?.totalCount || 0) + 1,
          },
        };
        return { ...old, pages: newPages };
      });

      return { previousMessages: previous, optimisticId };
    },

    // 3) on success, swap out the temp user-msg for the real one, then append the agent reply
    onSuccess: (res, _vars, ctx) => {
      const queryKey = getInfiniteQueryKey();
      if (!ctx?.optimisticId) return;

      queryClient.setQueryData<AgentMessagesInfiniteData>(queryKey, (old) => {
        if (!old) return old;

        const pages = old.pages.map((page, i) => {
          if (i !== 0) return page; // Only update the first page

          // Replace optimistic message and add agent reply
          const messages = page.messages.map((m) =>
            m.id === ctx.optimisticId ? { ...res.userMessage, _isOptimistic: false } : m,
          );
          const newMessages = [...messages, { ...res.agentMessage, _isOptimistic: false }];

          return {
            ...page,
            messages: newMessages,
            pagination: {
              ...page.pagination,
              totalCount: page.pagination.totalCount + 1,
            },
          };
        });
        return { ...old, pages };
      });
    },

    // 4) rollback on error
    onError: (err, _vars, ctx) => {
      console.error('Agent message failed:', err);
      const queryKey = getInfiniteQueryKey();
      if (ctx?.previousMessages) {
        queryClient.setQueryData(queryKey, ctx.previousMessages);
      }
      toast.error('Failed to send to agent. Try again.');
    },

    // 5) finally, refetch stale
    onSettled: (_data, _error) => {
      const queryKey = getInfiniteQueryKey();
      queryClient.invalidateQueries({ queryKey, exact: true, refetchType: 'none' });
      setTimeout(() => queryClient.invalidateQueries({ queryKey }), 1000);
    },
  });
};
