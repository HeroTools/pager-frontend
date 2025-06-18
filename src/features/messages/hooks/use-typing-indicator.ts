import { useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { messagesApi } from "../api/messages-api";

interface UseTypingIndicatorProps {
  workspaceId: string;
  channelId?: string;
  conversationId?: string;
  throttleMs?: number;
}

export const useTypingIndicator = ({
  workspaceId,
  channelId,
  conversationId,
  throttleMs = 1000, // Throttle typing indicators to once per second
}: UseTypingIndicatorProps) => {
  const lastTypingTime = useRef<number>(0);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTyping = useRef<boolean>(false);

  // Mutation for sending typing status
  const typingMutation = useMutation({
    mutationFn: async (isTyping: boolean) => {
      const endpoint = channelId
        ? `/workspaces/${workspaceId}/channels/${channelId}/typing`
        : `/workspaces/${workspaceId}/conversations/${conversationId}/typing`;

      return messagesApi.sendTypingIndicator(endpoint, { is_typing: isTyping });
    },
    onError: (error) => {
      console.error("Failed to send typing indicator:", error);
    },
  });

  // Send typing started indicator (throttled)
  const startTyping = useCallback(() => {
    const now = Date.now();

    // Throttle typing indicators
    if (now - lastTypingTime.current < throttleMs) {
      return;
    }

    if (!isCurrentlyTyping.current) {
      isCurrentlyTyping.current = true;
      lastTypingTime.current = now;
      typingMutation.mutate(true);
    }

    // Clear existing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeout.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [throttleMs, typingMutation]);

  // Send typing stopped indicator
  const stopTyping = useCallback(() => {
    if (isCurrentlyTyping.current) {
      isCurrentlyTyping.current = false;
      typingMutation.mutate(false);
    }

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
  }, [typingMutation]);

  // Handle input change (call this from your message input)
  const handleInputChange = useCallback(
    (value: string) => {
      if (value.length > 0) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping]
  );

  // Handle form submit (call this when message is sent)
  const handleSubmit = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  return {
    startTyping,
    stopTyping,
    handleInputChange,
    handleSubmit,
    isTyping: isCurrentlyTyping.current,
  };
};
