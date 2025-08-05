import type { MessageWithUser } from '@/features/messages/types';
import { messageRealtimeHandler, type RealtimeHandler } from '@/lib/realtime/realtime-handler';
import type { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChannelWithMessages } from '../types';

// It's better to define a more descriptive status set
type ConnectionStatus = 'CONNECTING' | 'SUBSCRIBED' | 'RECONNECTING' | 'CLOSED' | 'ERROR';

interface UseRealtimeChannelProps {
  workspaceId: string;
  channelId: string;
  currentUserId: string | undefined;
  enabled?: boolean;
}

// --- Mock Query Data Types ---
interface InfiniteQueryData {
  pages: ChannelWithMessages[];
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

export const useRealtimeChannel = ({
  workspaceId,
  channelId,
  currentUserId,
  enabled = true,
}: UseRealtimeChannelProps) => {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');

  // A single ref for the handler instance is cleaner
  const handlerRef = useRef<RealtimeHandler<typeof supabase> | null>(null);
  const processedRef = useRef<Map<string, number>>(new Map());

  // Ref to hold the latest message handlers, preventing effect re-runs
  const messageHandlersRef = useRef({
    onNew: (p: any) => {},
    onUpdate: (p: any) => {},
    onDelete: (p: any) => {},
  });

  const topic = useMemo(() => `channel:${channelId}`, [channelId]);
  const getChannelQueryKey = useCallback(
    () => ['channel', workspaceId, channelId, 'messages', 'infinite'] as const,
    [workspaceId, channelId],
  );
  const getThreadQueryKey = useCallback(
    (threadParentId: string) => ['thread', workspaceId, threadParentId] as const,
    [workspaceId],
  );

  // 1) Update parent message metadata (reply count & participants)
  const updateParentThreadMetadata = useCallback(
    (threadMessage: MessageWithUser) => {
      const parentMessageId = threadMessage.parent_message_id;
      if (!parentMessageId) {
        return;
      }

      queryClient.setQueryData<InfiniteQueryData>(getChannelQueryKey(), (old) => {
        if (!old?.pages?.length) {
          return old;
        }
        const newPages = old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((msg) => {
            if (msg.id === parentMessageId) {
              const currentParticipants = msg.thread_participants || [];
              const messageUser = threadMessage.user;
              const updatedParticipants =
                messageUser && !currentParticipants.some((id) => id === messageUser.id)
                  ? [...currentParticipants, messageUser.id]
                  : currentParticipants;

              return {
                ...msg,
                thread_reply_count: (msg.thread_reply_count || 0) + 1,
                thread_last_reply_at: threadMessage.created_at,
                thread_participants: updatedParticipants,
              };
            }
            return msg;
          }),
        }));
        return { ...old, pages: newPages };
      });
    },
    [queryClient, getChannelQueryKey],
  );

  // 2) Append to thread cache if first reply or existing thread
  const updateThreadCache = useCallback(
    (threadMessage: MessageWithUser) => {
      const parentMessageId = threadMessage.parent_message_id;
      if (!parentMessageId) {
        return;
      }

      const threadKey = getThreadQueryKey(parentMessageId);

      // Detect first reply
      let isFirstThreadMessage = false;
      const channelData = queryClient.getQueryData<InfiniteQueryData>(getChannelQueryKey());
      if (channelData?.pages) {
        for (const page of channelData.pages) {
          const parentMsg = page.messages.find((msg) => msg.id === parentMessageId);
          if (parentMsg) {
            isFirstThreadMessage = (parentMsg.thread_reply_count || 0) === 0;
            break;
          }
        }
      }

      const existingThreadData = queryClient.getQueryData<ThreadQueryData>(threadKey);

      if (isFirstThreadMessage || existingThreadData) {
        queryClient.setQueryData<ThreadQueryData>(threadKey, (old) => {
          if (!old) {
            return {
              replies: [threadMessage],
              members: [],
              pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
            };
          }
          const messageExists = old.replies.some((reply) => reply.id === threadMessage.id);
          if (messageExists) {
            return old;
          }
          return {
            ...old,
            replies: [...old.replies, threadMessage],
            pagination: {
              ...old.pagination,
              totalCount: old.pagination.totalCount + 1,
            },
          };
        });
      }
    },
    [queryClient, getChannelQueryKey, getThreadQueryKey],
  );

  // 3) Handle new incoming messages (exactly as before)
  const handleNewMessage = useCallback(
    (payload: any) => {
      try {
        const message = payload.message as MessageWithUser;
        if (message.user?.id === currentUserId) {
          return;
        }

        const now = Date.now();
        const DUPLICATE_WINDOW = 10 * 1000; // 10s

        // Duplicate check
        const lastProcessed = processedRef.current.get(message.id);
        if (lastProcessed && now - lastProcessed < DUPLICATE_WINDOW) {
          return;
        }

        // Record and prune
        processedRef.current.set(message.id, now);
        if (processedRef.current.size > 100) {
          const entries = Array.from(processedRef.current.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);
          processedRef.current = new Map(entries);
        }

        const isThreadMessage = Boolean(message.parent_message_id);

        if (isThreadMessage) {
          updateParentThreadMetadata(message);
          updateThreadCache(message);
        } else {
          queryClient.setQueryData<InfiniteQueryData>(getChannelQueryKey(), (old) => {
            if (!old?.pages?.length) {
              return {
                pages: [
                  {
                    messages: [message],
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
            const exists = old.pages.some((page) => page.messages.some((m) => m.id === message.id));
            if (exists) {
              return old;
            }
            const newPages = [...old.pages];
            newPages[0] = {
              ...newPages[0],
              messages: [message, ...newPages[0].messages],
              pagination: {
                ...newPages[0].pagination,
                totalCount: newPages[0].pagination.totalCount + 1,
              },
            };
            return { ...old, pages: newPages };
          });
        }
      } catch (error) {
        console.error('❌ Error handling new channel message:', error);
      }
    },
    [
      currentUserId,
      channelId,
      connectionStatus,
      queryClient,
      getChannelQueryKey,
      updateParentThreadMetadata,
      updateThreadCache,
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
          queryClient.setQueryData<InfiniteQueryData>(getChannelQueryKey(), (old) => {
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
        console.error('❌ Error handling channel message update:', error);
      }
    },
    [getChannelQueryKey, getThreadQueryKey, queryClient],
  );

  // 5) Message deletions (unchanged)
  const handleMessageDeleted = useCallback(
    (payload: any) => {
      try {
        const deletedId = payload.message_id as string;
        const parentId = payload.parent_message_id as string | undefined;

        if (parentId) {
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
                totalCount: old.pagination.totalCount - 1,
              },
            };
          });
        } else {
          queryClient.setQueryData<InfiniteQueryData>(getChannelQueryKey(), (old) => {
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
        console.error('❌ Error handling channel message deletion:', error);
      }
    },
    [getChannelQueryKey, getThreadQueryKey, queryClient],
  );

  useEffect(() => {
    messageHandlersRef.current = {
      onNew: handleNewMessage,
      onUpdate: handleMessageUpdated,
      onDelete: handleMessageDeleted,
    };
  }, [handleNewMessage, handleMessageUpdated, handleMessageDeleted]);

  // --- Main Setup Effect ---
  // This now has a stable dependency array and uses a standard cleanup pattern
  useEffect(() => {
    if (!enabled || !workspaceId || !channelId || !currentUserId) {
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
        .on('broadcast', { event: 'message_updated' }, ({ payload }) => {
          messageHandlersRef.current.onUpdate(payload);
        })
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
  }, [enabled, workspaceId, channelId, currentUserId, topic]); // Stable dependencies

  const forceReconnect = useCallback(() => {
    if (handlerRef.current) {
      setConnectionStatus('RECONNECTING');
      handlerRef.current.reconnectChannel(topic);
    }
  }, [topic]);

  // Derive boolean state from the connection status
  const isConnected = connectionStatus === 'SUBSCRIBED';

  return { isConnected, connectionStatus, forceReconnect };
};
