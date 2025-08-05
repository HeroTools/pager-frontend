import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { MessageWithUser } from '@/features/messages/types';
import { messageRealtimeHandler, type RealtimeHandler } from '@/lib/realtime/realtime-handler';
import type { supabase } from '@/lib/supabase/client';
import type { ConversationWithMessagesAndMembers } from '../types';

type ConnectionStatus = 'CONNECTING' | 'SUBSCRIBED' | 'RECONNECTING' | 'CLOSED' | 'ERROR';

interface UseRealtimeConversationProps {
  workspaceId: string;
  conversationId: string;
  currentUserId?: string;
  enabled?: boolean;
}

interface InfiniteQueryData {
  pages: ConversationWithMessagesAndMembers[];
  pageParams: (string | undefined)[];
}

interface ThreadQueryData {
  replies: MessageWithUser[];
  members: any[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

export const useRealtimeConversation = ({
  workspaceId,
  conversationId,
  currentUserId,
  enabled = true,
}: UseRealtimeConversationProps) => {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');

  const handlerRef = useRef<RealtimeHandler<typeof supabase> | null>(null);
  const processedRef = useRef<Map<string, number>>(new Map());
  const messageHandlersRef = useRef({
    onNew: (p: any) => {},
    onUpdate: (p: any) => {},
    onDelete: (p: any) => {},
  });

  const topic = useMemo(() => `conversation:${conversationId}`, [conversationId]);

  const getConversationQueryKey = useCallback(
    () => ['conversation', workspaceId, conversationId, 'messages', 'infinite'] as const,
    [workspaceId, conversationId],
  );
  const getThreadQueryKey = useCallback(
    (parentId: string) => ['thread', workspaceId, parentId] as const,
    [workspaceId],
  );

  // --- Helpers for parent thread metadata and thread cache ---
  const updateParentThreadMetadata = useCallback(
    (threadMsg: MessageWithUser) => {
      const parentId = threadMsg.parent_message_id;
      if (!parentId) {
        return;
      }

      queryClient.setQueryData<InfiniteQueryData>(getConversationQueryKey(), (old) => {
        if (!old?.pages?.length) {
          return old;
        }
        const newPages = old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((msg) => {
            if (msg.id === parentId) {
              const currentParticipants = msg.thread_participants || [];
              const messageUser = threadMsg.user;
              const updatedParticipants =
                messageUser && !currentParticipants.includes(messageUser.id)
                  ? [...currentParticipants, messageUser.id]
                  : currentParticipants;
              return {
                ...msg,
                thread_reply_count: (msg.thread_reply_count || 0) + 1,
                thread_last_reply_at: threadMsg.created_at,
                thread_participants: updatedParticipants,
              };
            }
            return msg;
          }),
        }));
        return { ...old, pages: newPages };
      });
    },
    [queryClient, getConversationQueryKey],
  );

  const updateThreadCache = useCallback(
    (threadMsg: MessageWithUser) => {
      const parentId = threadMsg.parent_message_id;
      if (!parentId) {
        return;
      }

      const threadKey = getThreadQueryKey(parentId);

      // Detect first reply
      let isFirstThreadMessage = false;
      const convData = queryClient.getQueryData<InfiniteQueryData>(getConversationQueryKey());
      if (convData?.pages) {
        for (const page of convData.pages) {
          const pm = page.messages.find((m) => m.id === parentId);
          if (pm) {
            isFirstThreadMessage = (pm.thread_reply_count || 0) === 0;
            break;
          }
        }
      }

      const existing = queryClient.getQueryData<ThreadQueryData>(threadKey);

      if (isFirstThreadMessage || existing) {
        queryClient.setQueryData<ThreadQueryData>(threadKey, (old) => {
          if (!old) {
            return {
              replies: [threadMsg],
              members: [],
              pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
            };
          }
          if (old.replies.some((r) => r.id === threadMsg.id)) {
            return old;
          }
          return {
            ...old,
            replies: [...old.replies, threadMsg],
            pagination: {
              ...old.pagination,
              totalCount: old.pagination.totalCount + 1,
            },
          };
        });
      }
    },
    [queryClient, getConversationQueryKey, getThreadQueryKey],
  );

  // --- Real-time message handlers ---
  const handleNewMessage = useCallback(
    (payload: any) => {
      try {
        const msg = payload.message as MessageWithUser;
        if (msg.user?.id === currentUserId) {
          return;
        }

        const now = Date.now();
        const DUPLICATE_WINDOW = 10 * 1000; // 10s

        // Prevent duplicate processing
        const lastProcessed = processedRef.current.get(msg.id);
        if (lastProcessed && now - lastProcessed < DUPLICATE_WINDOW) {
          return;
        }
        processedRef.current.set(msg.id, now);
        if (processedRef.current.size > 100) {
          const entries = Array.from(processedRef.current.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);
          processedRef.current = new Map(entries);
        }

        const isThread = Boolean(msg.parent_message_id);
        if (isThread) {
          updateParentThreadMetadata(msg);
          updateThreadCache(msg);
        } else {
          queryClient.setQueryData<InfiniteQueryData>(getConversationQueryKey(), (old) => {
            if (!old?.pages?.length) {
              return {
                pages: [
                  {
                    conversation: {
                      id: conversationId,
                      workspace_id: workspaceId,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      ...old?.pages?.[0]?.conversation,
                    },
                    messages: [msg],
                    members: [],
                    pagination: {
                      hasMore: false,
                      nextCursor: null,
                      totalCount: 1,
                    },
                  },
                ],
                pageParams: [undefined],
              };
            }
            if (old.pages.some((p) => p.messages.some((m) => m.id === msg.id))) {
              return old;
            }
            const first = old.pages[0];
            const updatedFirst = {
              ...first,
              messages: [msg, ...first.messages],
              pagination: {
                ...first.pagination,
                totalCount: first.pagination.totalCount + 1,
              },
            };
            return { ...old, pages: [updatedFirst, ...old.pages.slice(1)] };
          });
        }
      } catch (error) {
        console.error('❌ Error handling new conversation message:', error);
      }
    },
    [
      currentUserId,
      conversationId,
      workspaceId,
      updateParentThreadMetadata,
      updateThreadCache,
      queryClient,
      getConversationQueryKey,
    ],
  );

  const handleMessageUpdated = useCallback(
    (payload: any) => {
      try {
        const {
          message: { id: messageId, body, text, edited_at, updated_at, parent_message_id },
        } = payload;
        const isThread = Boolean(parent_message_id);

        if (isThread) {
          const threadKey = getThreadQueryKey(parent_message_id);
          queryClient.setQueryData<ThreadQueryData>(threadKey, (old) => {
            if (!old) {
              return old;
            }
            return {
              ...old,
              replies: old.replies.map((r) =>
                r.id === messageId
                  ? {
                      ...r,
                      body,
                      text,
                      edited_at,
                      updated_at,
                    }
                  : r,
              ),
            };
          });
        } else {
          queryClient.setQueryData<InfiniteQueryData>(getConversationQueryKey(), (old) => {
            if (!old?.pages?.length) {
              return old;
            }
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      body,
                      text,
                      edited_at,
                      updated_at,
                    }
                  : m,
              ),
            }));
            return { ...old, pages: newPages };
          });
        }
      } catch (error) {
        console.error('❌ Error handling conversation message update:', error);
      }
    },
    [getConversationQueryKey, getThreadQueryKey, queryClient],
  );

  const handleMessageDeleted = useCallback(
    (payload: any) => {
      try {
        const deletedId = payload.message_id as string;
        const parentId = payload.parent_message_id as string | undefined;
        if (parentId) {
          // Update reply count for parent, and remove from thread replies
          queryClient.setQueryData<InfiniteQueryData>(getConversationQueryKey(), (old) => {
            if (!old?.pages?.length) {
              return old;
            }
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === parentId
                  ? {
                      ...m,
                      thread_reply_count: Math.max(0, (m.thread_reply_count || 0) - 1),
                    }
                  : m,
              ),
            }));
            return { ...old, pages: newPages };
          });
          const threadKey = getThreadQueryKey(parentId);
          queryClient.setQueryData<ThreadQueryData>(threadKey, (old) => {
            if (!old) {
              return old;
            }
            return {
              ...old,
              replies: old.replies.filter((r) => r.id !== deletedId),
              pagination: {
                ...old.pagination,
                totalCount: Math.max(0, old.pagination.totalCount - 1),
              },
            };
          });
        } else {
          queryClient.setQueryData<InfiniteQueryData>(getConversationQueryKey(), (old) => {
            if (!old?.pages?.length) {
              return old;
            }
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== deletedId),
            }));
            return { ...old, pages: newPages };
          });
        }
      } catch (error) {
        console.error('❌ Error handling conversation message deletion:', error);
      }
    },
    [getConversationQueryKey, getThreadQueryKey, queryClient],
  );

  // --- Set the latest handler references ---
  useEffect(() => {
    messageHandlersRef.current = {
      onNew: handleNewMessage,
      onUpdate: handleMessageUpdated,
      onDelete: handleMessageDeleted,
    };
  }, [handleNewMessage, handleMessageUpdated, handleMessageDeleted]);

  // --- Setup and cleanup the realtime handler ---
  useEffect(() => {
    if (!enabled || !workspaceId || !conversationId || !currentUserId) {
      return;
    }

    setConnectionStatus('CONNECTING');
    const handler = messageRealtimeHandler;
    handlerRef.current = handler;

    const channelFactory = (sb: typeof supabase) =>
      sb
        .channel(topic, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'new_message' }, ({ payload }) =>
          messageHandlersRef.current.onNew(payload),
        )
        .on('broadcast', { event: 'message_updated' }, ({ payload }) =>
          messageHandlersRef.current.onUpdate(payload),
        )
        .on('broadcast', { event: 'message_deleted' }, ({ payload }) =>
          messageHandlersRef.current.onDelete(payload),
        );

    const subscriptionCallbacks = {
      onSubscribe: () => setConnectionStatus('SUBSCRIBED'),
      onClose: () => setConnectionStatus('CLOSED'),
      onTimeout: () => setConnectionStatus('RECONNECTING'),
      onError: () => setConnectionStatus('ERROR'),
    };

    handler.addChannel(channelFactory, subscriptionCallbacks);
    const cleanup = handler.start();

    return () => {
      cleanup();
      handlerRef.current = null;
    };
  }, [enabled, workspaceId, conversationId, currentUserId, topic]);

  const forceReconnect = useCallback(() => {
    if (handlerRef.current) {
      setConnectionStatus('RECONNECTING');
      handlerRef.current.reconnectChannel(topic);
    }
  }, [topic]);

  const isConnected = connectionStatus === 'SUBSCRIBED';

  return { isConnected, connectionStatus, forceReconnect };
};
