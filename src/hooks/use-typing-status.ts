import { broadcastTypingStatus } from '@/lib/utils/typing';
import { useCallback, useRef } from 'react';

interface UseTypingStatusProps {
  userId: string;
  channelId?: string;
  conversationId?: string;
  typingTimeout?: number;
  enabled?: boolean;
}

/**
 * Hook for sending typing start/stop events.
 */
export const useTypingStatus = ({
  userId,
  channelId,
  conversationId,
  typingTimeout = 2000,
  enabled = true,
}: UseTypingStatusProps) => {
  const timeoutRef = useRef<number>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!enabled || (!channelId && !conversationId)) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      broadcastTypingStatus(userId, channelId, conversationId, true);
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        broadcastTypingStatus(userId, channelId, conversationId, false);
      }
    }, typingTimeout);
  }, [userId, channelId, conversationId, typingTimeout, enabled]);

  const stopTyping = useCallback(() => {
    if (!enabled || (!channelId && !conversationId)) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (isTypingRef.current) {
      isTypingRef.current = false;
      broadcastTypingStatus(userId, channelId, conversationId, false);
    }
  }, [userId, channelId, conversationId, enabled]);

  return { startTyping, stopTyping };
};
