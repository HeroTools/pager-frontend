import { useEffect, useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import type { MessageWithUser, ChannelWithMessages } from "../types";

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

  // Use refs to track cleanup functions
  const cleanupFnsRef = useRef<(() => void)[]>([]);

  // Generate a stable key for React Query
  const getQueryKey = () => [
    "channel",
    workspaceId,
    channelId,
    "messages",
    "infinite",
  ];
  const topic = `channel:${channelId}`;

  useEffect(() => {
    if (!enabled || !channelId || !workspaceId || !currentUserId) return;

    setConnectionStatus("CONNECTING");
    const cleanupFns: (() => void)[] = [];

    // Handler: New messages
    const handleNewMessage = (payload: any) => {
      const message = payload.message as MessageWithUser;
      if (message.user?.id === currentUserId) return;

      queryClient.setQueryData<InfiniteQueryData>(getQueryKey(), (old) => {
        if (!old?.pages?.length) {
          return {
            pages: [
              {
                messages: [message],
                members: [],
                pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
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
      });
    };

    // Handler: Message updates
    const handleMessageUpdated = (payload: any) => {
      const updated = payload.message as MessageWithUser;
      queryClient.setQueryData<InfiniteQueryData>(getQueryKey(), (old) => {
        if (!old?.pages?.length) return old;
        const newPages = old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((msg) =>
            msg.id === updated.id ? updated : msg
          ),
        }));
        return { ...old, pages: newPages };
      });
    };

    // Handler: Message deletions
    const handleMessageDeleted = (payload: any) => {
      const deletedId = payload.messageId as string;
      queryClient.setQueryData<InfiniteQueryData>(getQueryKey(), (old) => {
        if (!old?.pages?.length) return old;
        const newPages = old.pages.map((page) => ({
          ...page,
          messages: page.messages.filter((m) => m.id !== deletedId),
        }));
        return { ...old, pages: newPages };
      });
    };

    // Subscribe to broadcast events and store cleanup functions
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

      // Remove status listener
      subscriptionManager.offStatusChange(topic, handleStatusChange);
    };
  }, [topic, workspaceId, channelId, currentUserId, enabled, queryClient]);

  return { isConnected, connectionStatus };
};
