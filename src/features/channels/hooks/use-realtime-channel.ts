// src/hooks/useRealtimeChannel.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
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
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED"
  >("CONNECTING");
  const channelRef = useRef<any>(null);

  // Stable query-key generator
  const getQueryKey = useMemo(
    () => () => ["channel", workspaceId, channelId, "messages", "infinite"],
    [workspaceId, channelId]
  );

  useEffect(() => {
    if (!enabled || !channelId || !workspaceId || !currentUserId) return;

    // Tear down any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a new realtime “channel”
    const channel = supabase
      .channel(`channel:${channelId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        "broadcast",
        { event: "new_message" },
        ({ payload }: { payload: any }) => {
          const message = payload.message as MessageWithUser;
          // ignore our own messages
          if (message.user?.id === currentUserId) return;

          queryClient.setQueryData<InfiniteQueryData>(getQueryKey(), (old) => {
            if (!old) return old;
            // skip duplicates
            const exists = old.pages.some((page) =>
              page.messages.some((m) => m.id === message.id)
            );
            if (exists) return old;
            // prepend to first page
            const newPages = [...old.pages];
            if (newPages[0]) {
              newPages[0] = {
                ...newPages[0],
                messages: [message, ...newPages[0].messages],
              };
            }
            return { ...old, pages: newPages };
          });
        }
      );

    console.log("subscribing to channel:", channelId);
    channel.subscribe((status, error) => {
      console.log(`Realtime status for channel ${channelId}:`, status);
      setConnectionStatus(status as any);
      if (status === "CHANNEL_ERROR") {
        console.error("Realtime error:", error);
      }
    });

    channelRef.current = channel;

    return () => {
      console.log("cleaning up channel subscription:", channelId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [channelId, workspaceId, currentUserId, enabled, queryClient]);

  return {
    isConnected: connectionStatus === "SUBSCRIBED",
    connectionStatus,
  };
};
