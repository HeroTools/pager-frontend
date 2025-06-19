import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { MessageWithUser, ChannelWithMessages } from "../types";

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

export const useRealtimeChannel = ({
  workspaceId,
  channelId,
  currentUserId,
  enabled = true,
}: UseRealtimeChannelProps) => {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<string>("connecting");
  const channelRef = useRef<any>(null);

  // Memoize the query key function to prevent recreating it
  const getQueryKey = useMemo(
    () => () => ["channel", workspaceId, channelId, "messages", "infinite"],
    [workspaceId, channelId]
  );

  useEffect(() => {
    console.log("useRealtimeChannel useEffect");
    if (!enabled || !channelId || !workspaceId || !currentUserId) return;

    // Clean up previous channel if it exists
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create real-time channel subscription
    const channel = supabase.channel(`channel:${channelId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    // Listen for new messages
    channel.on("broadcast", { event: "new_message" }, (payload) => {
      const { message } = payload.payload as { message: MessageWithUser };

      if (message.user?.id === currentUserId) return;

      console.log("Received new message:", message);

      queryClient.setQueryData<InfiniteQueryData>(getQueryKey(), (old) => {
        if (!old) return old;

        // Check if message already exists
        const messageExists = old.pages.some((page) =>
          page.messages.some((msg) => msg.id === message.id)
        );

        if (messageExists) return old;

        // Add new message to the FIRST page at the BEGINNING
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
        `Real-time subscription status for channel ${channelId}:`,
        status
      );
      setConnectionStatus(status);

      if (status === "CHANNEL_ERROR") {
        console.error(
          "Subscription error - check your Supabase connection and RLS policies"
        );
      }
      if (status === "CLOSED") {
        console.warn("Real-time connection closed");
      }
    });

    channelRef.current = channel;

    // return () => {
    //   console.log("Cleaning up channel subscription for:", channelId);
    //   if (channelRef.current) {
    //     channelRef.current.unsubscribe();
    //     supabase.removeChannel(channelRef.current);
    //     channelRef.current = null;
    //   }
    // };
  }, [channelId, workspaceId, currentUserId, enabled]);

  return {
    isConnected: connectionStatus === "SUBSCRIBED",
    connectionStatus,
  };
};
