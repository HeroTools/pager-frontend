import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { authQueryKeys } from '@/features/auth/query-keys';
import { CurrentUser } from '@/features/auth/types';
import { streamAgentChat } from '../api/streaming-api';
import type { ThinkingEvent } from '../types';

interface MessageStreamingState {
  isStreaming: boolean;
  thinking: ThinkingEvent | null;
  optimisticId: string | null;
}

export const useCreateMessage = (
  workspaceId: string,
  agentId: string,
  conversationId: string | null,
) => {
  const queryClient = useQueryClient();
  const streamingContentRef = useRef<string>('');

  // State for tracking streaming per message
  const [messageStreamingState, setMessageStreamingState] = useState<MessageStreamingState>({
    isStreaming: false,
    thinking: null,
    optimisticId: null,
  });

  // Track the current temp conversation ID to ensure consistency
  const currentTempConversationIdRef = useRef<string | null>(null);

  const getInfiniteQueryKey = useCallback(
    (cId: string) => ['agent-conversation-messages-infinite', workspaceId, agentId, cId] as const,
    [workspaceId, agentId],
  );

  const getConversationsQueryKey = useCallback(
    () => ['agent-conversations', workspaceId, agentId] as const,
    [workspaceId, agentId],
  );

  const clearStreamingState = useCallback(() => {
    setMessageStreamingState({
      isStreaming: false,
      thinking: null,
      optimisticId: null,
    });
    streamingContentRef.current = '';
  }, []);

  const updateOptimisticMessageWithThinking = useCallback(
    (optimisticId: string, thinking: ThinkingEvent | null, isStreaming: boolean) => {
      // Use the tracked temp conversation ID instead of creating a new one
      const tempConversationId = conversationId || currentTempConversationIdRef.current;
      if (!tempConversationId) return;

      const queryKey = getInfiniteQueryKey(tempConversationId);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.pages?.length) return old;

        const pages = old.pages.map((page: any, i: number) => {
          if (i !== 0) return page;

          const messages = page.messages.map((m: any) => {
            if (m._isStreaming && m.sender_type === 'agent') {
              return {
                ...m,
                _thinking: thinking,
                _isStreaming: isStreaming,
                body: streamingContentRef.current,
              };
            }
            return m;
          });

          return { ...page, messages };
        });
        return { ...old, pages };
      });
    },
    [conversationId, queryClient, getInfiniteQueryKey],
  );

  const mutation = useMutation({
    mutationKey: ['createStreamingAgentMessage', workspaceId, agentId, conversationId],

    mutationFn: async (data: {
      message: string;
      _optimisticId?: string;
      _tempConversationId?: string;
    }) => {
      // Prevent new requests if currently streaming
      if (messageStreamingState.isStreaming) {
        throw new Error('Please wait for the current response to complete');
      }

      // Reset streaming state
      clearStreamingState();
      const optimisticId = data._optimisticId || `temp-${Date.now()}-${Math.random()}`;

      setMessageStreamingState({
        isStreaming: true,
        thinking: { status: 'thinking', message: 'Thinking...' },
        optimisticId,
      });

      // Reset the content ref at the start
      streamingContentRef.current = '';

      // Immediately show temporary thinking state
      updateOptimisticMessageWithThinking(
        optimisticId,
        { status: 'thinking', message: 'Thinking...' },
        true,
      );

      return new Promise((resolve, reject) => {
        streamAgentChat(
          {
            message: data.message,
            conversationId,
            agentId,
            workspaceId,
          },
          {
            onUserMessage: (userData) => {},
            onContentDelta: (content) => {
              // Only append new content, don't reset
              streamingContentRef.current += content;
              // Update the optimistic message with accumulated content
              updateOptimisticMessageWithThinking(
                optimisticId,
                messageStreamingState.thinking,
                true,
              );
            },
            onAgentSwitch: (agent) => {},
            onToolCall: (toolCall) => {},
            onAgentStep: (step) => {},
            onAgentThinking: (thinking) => {
              setMessageStreamingState((prev) => ({
                ...prev,
                thinking,
              }));

              // Update the optimistic message with thinking state
              updateOptimisticMessageWithThinking(optimisticId, thinking, true);
            },
            onComplete: (completeData) => {
              // Immediately clear streaming state instead of waiting
              setMessageStreamingState({
                isStreaming: false,
                thinking: null,
                optimisticId: null,
              });

              // Final update to remove streaming state from message
              updateOptimisticMessageWithThinking(optimisticId, null, false);

              resolve(completeData);
            },
            onError: (error) => {
              console.error('❌ Stream error:', error);
              setMessageStreamingState((prev) => ({
                ...prev,
                isStreaming: false,
                thinking: null,
              }));
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

      const tempConversationId =
        data._tempConversationId || conversationId || `temp-${agentId}-${Date.now()}`;

      // Track the temp conversation ID for consistency in streaming updates
      if (!conversationId) {
        currentTempConversationIdRef.current = tempConversationId;
      }

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
        _thinking: { type: 'thinking', message: 'Thinking...' },
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

    onSuccess: (res: any, _vars, ctx) => {
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
            { ...res.agentMessage, _isOptimistic: false, _isStreaming: false, _thinking: null },
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
          if (!oldData?.agent) {
            return {
              agent: { id: agentId, name: '', avatar_url: null, is_active: true },
              conversation: res.conversation,
            };
          }
          return {
            ...oldData,
            conversation: res.conversation,
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
                return {
                  ...res.agentMessage,
                  _isOptimistic: false,
                  _isStreaming: false,
                  _thinking: null,
                };
              }
              return m;
            });

            return { ...page, messages };
          });
          return { ...old, pages };
        });
      }

      // Clear streaming state and temp conversation ID immediately after successful completion
      clearStreamingState();
      if (isNewConversation && newConversationId) {
        currentTempConversationIdRef.current = null;
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
      clearStreamingState();
      currentTempConversationIdRef.current = null;
    },
  });

  return {
    ...mutation,
    // Expose message-specific streaming state
    messageStreamingState,
    clearStreamingState,
  };
};
