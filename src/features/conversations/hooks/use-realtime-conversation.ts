import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import type { ConversationWithMessagesAndMembers } from "../types";
import type { MessageWithUser } from "@/features/messages/types";

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
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED" | "TIMED_OUT"
  >("CONNECTING");
  const [connectionInfo, setConnectionInfo] = useState({
    reconnectAttempts: 0,
    circuitBreakerOpen: false,
    lastActivity: Date.now(),
  });

  const lastStatusRef = useRef<string>("CONNECTING");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const getConversationQueryKey = useCallback(
    () => ["conversation", workspaceId, conversationId, "messages", "infinite"],
    [workspaceId, conversationId]
  );

  const getThreadQueryKey = useCallback(
    (threadParentId: string) => ["thread", workspaceId, threadParentId],
    [workspaceId]
  );

  const topic = `conversation:${conversationId}`;

  const updateParentThreadMetadata = useCallback(
    (threadMessage: MessageWithUser) => {
      const parentMessageId = threadMessage.parent_message_id;
      if (!parentMessageId) return;

      queryClient.setQueryData<InfiniteQueryData>(
        getConversationQueryKey(),
        (old) => {
          if (!old?.pages?.length) return old;

          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) => {
              if (msg.id === parentMessageId) {
                const currentParticipants = msg.thread_participants || [];
                const messageUser = threadMessage.user;

                const updatedParticipants =
                  messageUser &&
                  !currentParticipants.some((id) => id === messageUser.id)
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
        }
      );
    },
    [queryClient, getConversationQueryKey]
  );

  const updateThreadCache = useCallback(
    (threadMessage: MessageWithUser) => {
      const parentMessageId = threadMessage.parent_message_id;
      if (!parentMessageId) return;

      const threadQueryKey = getThreadQueryKey(parentMessageId);

      let isFirstThreadMessage = false;
      const conversationData = queryClient.getQueryData<InfiniteQueryData>(
        getConversationQueryKey()
      );
      if (conversationData?.pages) {
        for (const page of conversationData.pages) {
          const parentMessage = page.messages.find(
            (msg) => msg.id === parentMessageId
          );
          if (parentMessage) {
            isFirstThreadMessage =
              (parentMessage.thread_reply_count || 0) === 0;
            break;
          }
        }
      }

      const existingThreadData =
        queryClient.getQueryData<ThreadQueryData>(threadQueryKey);

      if (isFirstThreadMessage || existingThreadData) {
        queryClient.setQueryData<ThreadQueryData>(threadQueryKey, (old) => {
          if (!old) {
            return {
              replies: [threadMessage],
              members: [],
              pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
            };
          }

          const messageExists = old.replies.some(
            (reply) => reply.id === threadMessage.id
          );
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
    [queryClient, getConversationQueryKey, getThreadQueryKey]
  );

  useEffect(() => {
    if (!enabled || !conversationId || !workspaceId || !currentUserId) return;

    setConnectionStatus("CONNECTING");
    setConnectionInfo((prev) => ({
      ...prev,
      reconnectAttempts: 0,
      circuitBreakerOpen: false,
    }));

    const handleNewMessage = (payload: any) => {
      const message = payload.message as MessageWithUser;
      if (message.user?.id === currentUserId) return;

      setConnectionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));
      const isThreadMessage = Boolean(message.parent_message_id);

      if (isThreadMessage) {
        updateParentThreadMetadata(message);
        updateThreadCache(message);
      } else {
        queryClient.setQueryData<InfiniteQueryData>(
          getConversationQueryKey(),
          (old) => {
            if (!old?.pages?.length) {
              return {
                pages: [
                  {
                    conversation: {
                      id: conversationId,
                      workspace_id: workspaceId,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
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

            const exists = old.pages.some((page) =>
              page.messages.some((m) => m.id === message.id)
            );
            if (exists) return old;

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
          }
        );
      }
    };

    const handleMessageUpdated = (payload: any) => {
      const updated = payload.message as MessageWithUser;
      const isThreadMessage = Boolean(updated.parent_message_id);

      setConnectionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));

      if (isThreadMessage) {
        const threadQueryKey = getThreadQueryKey(updated.parent_message_id!);
        queryClient.setQueryData<ThreadQueryData>(threadQueryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            replies: old.replies.map((reply) =>
              reply.id === updated.id ? updated : reply
            ),
          };
        });
      } else {
        queryClient.setQueryData<InfiniteQueryData>(
          getConversationQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.id === updated.id ? updated : msg
              ),
            }));
            return { ...old, pages: newPages };
          }
        );
      }
    };

    const handleMessageDeleted = (payload: any) => {
      const deletedId = payload.messageId as string;
      const parentMessageId = payload.parentMessageId as string | undefined;

      setConnectionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));

      if (parentMessageId) {
        queryClient.setQueryData<InfiniteQueryData>(
          getConversationQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) => {
                if (msg.id === parentMessageId) {
                  return {
                    ...msg,
                    thread_reply_count: Math.max(
                      0,
                      (msg.thread_reply_count || 0) - 1
                    ),
                  };
                }
                return msg;
              }),
            }));
            return { ...old, pages: newPages };
          }
        );

        const threadQueryKey = getThreadQueryKey(parentMessageId);
        queryClient.setQueryData<ThreadQueryData>(threadQueryKey, (old) => {
          if (!old) return old;
          return {
            ...old,
            replies: old.replies.filter((reply) => reply.id !== deletedId),
            pagination: {
              ...old.pagination,
              totalCount: Math.max(0, old.pagination.totalCount - 1),
            },
          };
        });
      } else {
        queryClient.setQueryData<InfiniteQueryData>(
          getConversationQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;
            const newPages = old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== deletedId),
            }));
            return { ...old, pages: newPages };
          }
        );
      }
    };

    const handleStatusChange = (status: string) => {
      // Prevent rapid status updates
      if (lastStatusRef.current === status) return;
      lastStatusRef.current = status;

      setConnectionStatus(status as any);
      setIsConnected(status === "SUBSCRIBED");

      // Update connection info based on subscription manager state
      const health = subscriptionManager.getConnectionHealth();
      const conversationState = health.channelStates.find(
        (ch) => ch.topic === topic
      );

      if (conversationState) {
        setConnectionInfo((prev) => ({
          ...prev,
          reconnectAttempts: conversationState.reconnectAttempts,
          circuitBreakerOpen:
            conversationState.circuitBreakerOpen ||
            health.globalCircuitBreakerOpen,
        }));
      }

      // Clear any pending manual reconnection attempts on successful connection
      if (status === "SUBSCRIBED" && reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };

    subscriptionManager.subscribeBroadcast(
      topic,
      "new_message",
      handleNewMessage
    );
    subscriptionManager.subscribeBroadcast(
      topic,
      "message_updated",
      handleMessageUpdated
    );
    subscriptionManager.subscribeBroadcast(
      topic,
      "message_deleted",
      handleMessageDeleted
    );
    subscriptionManager.onStatusChange(topic, handleStatusChange);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
      subscriptionManager.unsubscribe(topic);
      subscriptionManager.offStatusChange(topic, handleStatusChange);
    };
  }, [
    topic,
    workspaceId,
    conversationId,
    currentUserId,
    enabled,
    queryClient,
    getConversationQueryKey,
    getThreadQueryKey,
    updateParentThreadMetadata,
    updateThreadCache,
  ]);

  // Manual reconnect function with built-in cooldown
  const forceReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      console.log(
        "Reconnection already in progress, skipping manual reconnect"
      );
      return;
    }

    // Add a small delay to prevent immediate retry loops
    reconnectTimeoutRef.current = setTimeout(() => {
      subscriptionManager.forceReconnect(topic);
      reconnectTimeoutRef.current = undefined;
    }, 1000);
  }, [topic]);

  // Get current connection health
  const getConnectionHealth = useCallback(() => {
    const health = subscriptionManager.getConnectionHealth();
    const conversationState = health.channelStates.find(
      (ch) => ch.topic === topic
    );

    return {
      ...health,
      conversationState: conversationState || null,
    };
  }, [topic]);

  return {
    isConnected,
    connectionStatus,
    connectionInfo,
    forceReconnect,
    getConnectionHealth,
  };
};
