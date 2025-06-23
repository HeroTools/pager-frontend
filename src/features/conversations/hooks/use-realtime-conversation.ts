// src/hooks/useRealtimeConversation.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
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
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED"
  >("CONNECTING");
  const channelRef = useRef<any>(null);

  // Stable query-key generator
  const getQueryKey = useMemo(
    () => () =>
      ["conversation", workspaceId, conversationId, "messages", "infinite"],
    [workspaceId, conversationId]
  );

  useEffect(() => {
    // don’t run until we have everything we need
    if (!enabled || !conversationId || !workspaceId || !currentUserId) {
      return;
    }

    // Tear down any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create a new realtime “channel”
    const channel = supabase
      .channel(`conversation:${conversationId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        "broadcast",
        { event: "new_message" },
        ({ payload }: { payload: any }) => {
          const message = payload.message as ConversationMessageWithUser;
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

    console.log("subscribing to conversation:", conversationId);
    channel.subscribe((status, error) => {
      console.log(
        `Realtime status for conversation ${conversationId}:`,
        status,
        error
      );
      setConnectionStatus(status as any);

      if (status === "CHANNEL_ERROR") {
        console.error("Realtime error:", error);
      }
    });

    channelRef.current = channel;

    return () => {
      console.log("cleaning up conversation subscription:", conversationId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, workspaceId, currentUserId, enabled, queryClient]);

  return {
    isConnected: connectionStatus === "SUBSCRIBED",
    connectionStatus,
  };
};
