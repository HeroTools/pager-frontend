import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  ConversationMessageWithUser,
  ConversationWithMessagesAndMembers,
} from "../types";

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

export const useRealtimeConversation = ({
  workspaceId,
  conversationId,
  currentUserId,
  enabled = true,
}: UseRealtimeConversationProps) => {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<string>("connecting");
  const channelRef = useRef<any>(null);

  // Consistent query key - use same key as your infinite query
  const getQueryKey = () => [
    "conversation",
    workspaceId,
    conversationId,
    "messages",
    "infinite",
  ];

  useEffect(() => {
    if (!enabled || !conversationId || !workspaceId) return;

    // Create real-time channel subscription
    const channel = supabase.channel(`conversation:${conversationId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    // Listen for new messages
    channel.on("broadcast", { event: "new_message" }, (payload) => {
      const { message } = payload.payload as {
        message: ConversationMessageWithUser;
      };

      if (message.user?.id === currentUserId) return;

      console.log("Received new message:", message);

      queryClient.setQueryData<InfiniteQueryData>(getQueryKey(), (old) => {
        if (!old) return old;

        // Check if message already exists
        const messageExists = old.pages.some((page) =>
          page.messages.some((msg) => msg.id === message.id)
        );

        if (messageExists) return old;

        // FIXED: Add new message to the FIRST page at the BEGINNING
        // Since we're using reverse chronological order in pages
        const newPages = [...old.pages];
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            messages: [message, ...newPages[0].messages],
          };
        }

        return {
          ...old,
          pages: newPages,
        };
      });
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(
        `Real-time subscription status for conversation ${conversationId}:`,
        status
      );
      setConnectionStatus(status);

      if (status === "SUBSCRIPTION_ERROR") {
        console.error(
          "Subscription error - check your Supabase connection and RLS policies"
        );
      }
      if (status === "CLOSED") {
        console.warn("Real-time connection closed");
      }
    });

    channelRef.current = channel;
  }, [conversationId, workspaceId, currentUserId, enabled, queryClient]);

  return {
    isConnected: connectionStatus === "SUBSCRIBED",
    connectionStatus,
  };
};
