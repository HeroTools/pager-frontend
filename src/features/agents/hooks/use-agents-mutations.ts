import { authQueryKeys } from '@/features/auth/query-keys';
import { CurrentUser } from '@/features/auth/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { streamAgentChat } from '../api/streaming-api';

export const useCreateMessage = (
  workspaceId: string,
  agentId: string,
  conversationId: string | null,
) => {
  const queryClient = useQueryClient();
  const streamingContentRef = useRef<string>('');

  const getInfiniteQueryKey = useCallback(
    (cId: string) => ['agent-conversation-messages-infinite', workspaceId, agentId, cId] as const,
    [workspaceId, agentId],
  );

  const getConversationsQueryKey = useCallback(
    () => ['agent-conversations', workspaceId, agentId] as const,
    [workspaceId, agentId],
  );

  return useMutation({
    mutationKey: ['createStreamingAgentMessage', workspaceId, agentId, conversationId],

    mutationFn: async (data: { message: string; _optimisticId?: string }) => {
      streamingContentRef.current = '';

      return new Promise((resolve, reject) => {
        streamAgentChat(
          {
            message: data.message,
            conversationId,
            agentId,
            workspaceId,
          },
          {
            onUserMessage: (userData) => {
              // Handle user message confirmation if needed
              console.log('User message saved:', userData);
            },
            onContentDelta: (content) => {
              streamingContentRef.current += content;
              // Update the optimistic agent message in real-time
              updateOptimisticAgentMessage(data._optimisticId, streamingContentRef.current);
            },
            onAgentSwitch: (agent) => {
              console.log('Agent switched to:', agent);
            },
            onToolCall: (toolCall) => {
              console.log('Tool call:', toolCall);
            },
            onComplete: (completeData) => {
              resolve(completeData);
            },
            onError: (error) => {
              reject(new Error(error));
            },
          },
        ).catch(reject);
      });
    },

    onMutate: async (data) => {
      const isNewConversation = !conversationId;
      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());

      if (!currentUser) {
        console.error('No current user for optimistic agent message');
        return { isNewConversation };
      }

      const tempConversationId = conversationId || `temp-${agentId}-${Date.now()}`;
      const optimisticId = data._optimisticId || `temp-${Date.now()}-${Math.random()}`;
      const agentOptimisticId = `agent-temp-${Date.now()}-${Math.random()}`;

      const optimisticUserMsg = {
        id: optimisticId,
        body: data.message,
        conversation_id: tempConversationId,
        workspace_id: workspaceId,
        workspace_member_id: currentUser.workspace_member_id,
        ai_agent_id: null,
        sender_type: 'user',
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
        },
        created_at: new Date().toISOString(),
        _isOptimistic: true,
      };

      const optimisticAgentMsg = {
        id: agentOptimisticId,
        body: '',
        conversation_id: tempConversationId,
        workspace_id: workspaceId,
        ai_agent_id: agentId,
        sender_type: 'agent',
        created_at: new Date().toISOString(),
        _isOptimistic: true,
        _isStreaming: true,
      };

      const queryKey = getInfiniteQueryKey(tempConversationId);
      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages?.length) {
          return {
            pages: [
              {
                conversation: {
                  id: tempConversationId,
                  workspace_id: workspaceId,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  title: null,
                },
                agent: { id: agentId, name: '', avatar_url: null, is_active: true },
                messages: [optimisticUserMsg, optimisticAgentMsg],
                pagination: { hasMore: false, nextCursor: null, totalCount: 2 },
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

        newPages[0] = {
          ...firstPage,
          messages: [...firstPage.messages, optimisticUserMsg, optimisticAgentMsg],
          pagination: {
            ...firstPage.pagination,
            totalCount: (firstPage.pagination?.totalCount || 0) + 2,
          },
        };
        return { ...old, pages: newPages };
      });

      return {
        previousMessages,
        optimisticId,
        agentOptimisticId,
        isNewConversation,
        tempConversationId,
      };
    },

    onSuccess: (res, _vars, ctx) => {
      const isNewConversation = ctx?.isNewConversation;
      const newConversationId = res.conversation?.id;
      const tempConversationId = ctx?.tempConversationId;

      if (isNewConversation && newConversationId && tempConversationId) {
        const tempQueryKey = getInfiniteQueryKey(tempConversationId);
        queryClient.removeQueries({ queryKey: tempQueryKey });

        const realQueryKey = getInfiniteQueryKey(newConversationId);
        const initialPageData = {
          conversation: res.conversation,
          agent: { id: agentId, name: '', avatar_url: null, is_active: true },
          messages: [
            { ...res.userMessage, _isOptimistic: false },
            { ...res.agentMessage, _isOptimistic: false },
          ],
          pagination: { hasMore: false, nextCursor: null, totalCount: 2 },
          user_conversation_data: {
            member_id: '',
            last_read_message_id: null,
            workspace_member_id: res.userMessage.workspace_member_id,
          },
        };

        queryClient.setQueryData(realQueryKey, {
          pages: [initialPageData],
          pageParams: [undefined],
        });

        const conversationsQueryKey = getConversationsQueryKey();
        queryClient.setQueryData(conversationsQueryKey, (oldData: any) => {
          if (!oldData) {
            return { conversations: [res.conversation] };
          }
          return {
            ...oldData,
            conversations: [res.conversation, ...oldData.conversations],
          };
        });
      } else if (!isNewConversation && conversationId) {
        const queryKey = getInfiniteQueryKey(conversationId);

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;

          const pages = old.pages.map((page: any, i: number) => {
            if (i !== 0) return page;

            const messages = page.messages.map((m: any) => {
              if (m.id === ctx?.optimisticId) {
                return { ...res.userMessage, _isOptimistic: false };
              }
              if (m.id === ctx?.agentOptimisticId) {
                return { ...res.agentMessage, _isOptimistic: false };
              }
              return m;
            });

            return { ...page, messages };
          });
          return { ...old, pages };
        });
      }
    },

    onError: (err, _vars, ctx) => {
      console.error('Streaming agent message failed:', err);

      if (ctx?.isNewConversation && ctx?.tempConversationId) {
        const tempQueryKey = getInfiniteQueryKey(ctx.tempConversationId);
        queryClient.removeQueries({ queryKey: tempQueryKey });
      } else if (conversationId) {
        const queryKey = getInfiniteQueryKey(conversationId);
        if (ctx?.previousMessages) {
          queryClient.setQueryData(queryKey, ctx.previousMessages);
        }
      }

      toast.error('Failed to send to agent. Try again.');
    },
  });

  function updateOptimisticAgentMessage(userOptimisticId: string | undefined, content: string) {
    if (!userOptimisticId) return;

    const tempConversationId = conversationId || `temp-${agentId}-${Date.now()}`;
    const queryKey = getInfiniteQueryKey(tempConversationId);

    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old?.pages?.length) return old;

      const pages = old.pages.map((page: any, i: number) => {
        if (i !== 0) return page;

        const messages = page.messages.map((m: any) => {
          if (m._isStreaming && m.sender_type === 'agent') {
            return { ...m, body: content };
          }
          return m;
        });

        return { ...page, messages };
      });
      return { ...old, pages };
    });
  }
};
