import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import type { ChannelWithMessages } from "../types";
import { MessageWithUser } from "@/features/messages/types";

interface UseRealtimeChannelProps {
  workspaceId: string;
  channelId: string;
  currentUserId?: string;
  enabled?: boolean;
}

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

/**
 * Hook to manage real-time message events via SubscriptionManager.
 */
export const useRealtimeChannel = ({
  workspaceId,
  channelId,
  currentUserId,
  enabled = true,
}: UseRealtimeChannelProps) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED" | "TIMED_OUT"
  >("CONNECTING");

  // Generate stable keys for React Query
  const getChannelQueryKey = () => [
    "channel",
    workspaceId,
    channelId,
    "messages",
    "infinite",
  ];

  const getThreadQueryKey = (threadParentId: string) => [
    "thread",
    workspaceId,
    threadParentId,
  ];

  const topic = `channel:${channelId}`;

  /**
   * Update thread metadata on the parent message when a thread reply is received
   */
  const updateParentThreadMetadata = (threadMessage: MessageWithUser) => {
    const parentMessageId = threadMessage.parent_message_id;
    if (!parentMessageId) return;

    queryClient.setQueryData<InfiniteQueryData>(getChannelQueryKey(), (old) => {
      if (!old?.pages?.length) return old;

      const newPages = old.pages.map((page) => ({
        ...page,
        messages: page.messages.map((msg) => {
          if (msg.id === parentMessageId) {
            // Update thread metadata
            const currentParticipants = msg.thread_participants || [];
            const messageUser = threadMessage.user;

            // Add user to participants if not already there
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
    });
  };

  /**
   * Add thread message to thread cache with smart logic:
   * - If parent has thread_reply_count = 0: Create cache (first message)
   * - If parent has thread_reply_count > 0: Only update if cache exists (user opened thread)
   */
  const updateThreadCache = (threadMessage: MessageWithUser) => {
    const parentMessageId = threadMessage.parent_message_id;
    if (!parentMessageId) return;

    const threadQueryKey = getThreadQueryKey(parentMessageId);

    // Check parent message's thread_reply_count to determine if this is the first thread message
    let isFirstThreadMessage = false;
    const channelData = queryClient.getQueryData<InfiniteQueryData>(
      getChannelQueryKey()
    );
    if (channelData?.pages) {
      for (const page of channelData.pages) {
        const parentMessage = page.messages.find(
          (msg) => msg.id === parentMessageId
        );
        if (parentMessage) {
          isFirstThreadMessage = (parentMessage.thread_reply_count || 0) === 0;
          break;
        }
      }
    }

    // Check if thread cache exists
    const existingThreadData =
      queryClient.getQueryData<ThreadQueryData>(threadQueryKey);

    // If this is the first thread message OR thread cache already exists, proceed with update
    if (isFirstThreadMessage || existingThreadData) {
      queryClient.setQueryData<ThreadQueryData>(threadQueryKey, (old) => {
        if (!old) {
          // Create new thread cache structure (for first message)
          return {
            replies: [threadMessage],
            members: [],
            pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
          };
        }

        // Check if message already exists to prevent duplicates
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
  };

  useEffect(() => {
    if (!enabled || !channelId || !workspaceId || !currentUserId) return;

    setConnectionStatus("CONNECTING");

    // Handler: New messages
    const handleNewMessage = (payload: any) => {
      const message = payload.message as MessageWithUser;
      if (message.user?.id === currentUserId) return;

      // Check if this is a thread message
      const isThreadMessage = Boolean(message.parent_message_id);

      if (isThreadMessage) {
        // Update parent message's thread metadata
        updateParentThreadMetadata(message);

        // Update thread cache if it exists
        updateThreadCache(message);
      } else {
        // Handle regular channel message
        queryClient.setQueryData<InfiniteQueryData>(
          getChannelQueryKey(),
          (old) => {
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

    // Handler: Message updates
    const handleMessageUpdated = (payload: any) => {
      const updated = payload.message as MessageWithUser;
      const isThreadMessage = Boolean(updated.parent_message_id);

      if (isThreadMessage) {
        // Update in thread cache if it exists
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
        // Update in channel messages
        queryClient.setQueryData<InfiniteQueryData>(
          getChannelQueryKey(),
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

    // Handler: Message deletions
    const handleMessageDeleted = (payload: any) => {
      const deletedId = payload.messageId as string;
      const parentMessageId = payload.parentMessageId as string | undefined;

      if (parentMessageId) {
        // Thread message deleted - update parent metadata and thread cache
        queryClient.setQueryData<InfiniteQueryData>(
          getChannelQueryKey(),
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

        // Remove from thread cache if it exists
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
        // Regular channel message deleted
        queryClient.setQueryData<InfiniteQueryData>(
          getChannelQueryKey(),
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

    // Subscribe to broadcast events
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

    // Listen to connection status updates
    const handleStatusChange = (status: string) => {
      setConnectionStatus(status as any);
      setIsConnected(status === "SUBSCRIBED");
    };

    subscriptionManager.onStatusChange(topic, handleStatusChange);

    // Cleanup on unmount or dependency change
    return () => {
      subscriptionManager.unsubscribe(topic);
      subscriptionManager.offStatusChange(topic, handleStatusChange);
    };
  }, [topic, workspaceId, channelId, currentUserId, enabled, queryClient]);

  return { isConnected, connectionStatus };
};
