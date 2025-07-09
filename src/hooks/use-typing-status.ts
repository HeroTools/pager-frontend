import { broadcastTypingStatus } from '@/lib/utils/typing';
import { useCallback, useEffect, useRef } from 'react';

interface UseTypingStatusProps {
  userId: string;
  channelId?: string;
  conversationId?: string;
  typingTimeout?: number;
}

export const useTypingStatus = ({
  userId,
  channelId,
  conversationId,
  typingTimeout = 3000,
}: UseTypingStatusProps) => {
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      broadcastTypingStatus(userId, channelId, conversationId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        broadcastTypingStatus(userId, channelId, conversationId, false);
      }
    }, typingTimeout);
  }, [userId, channelId, conversationId, typingTimeout]);

  const stopTyping = useCallback(() => {
    console.log('stop typing');
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      broadcastTypingStatus(userId, channelId, conversationId, false);
    }
  }, [userId, channelId, conversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTypingRef.current) {
        broadcastTypingStatus(userId, channelId, conversationId, false);
      }
    };
  }, [userId, channelId, conversationId]);

  return { startTyping, stopTyping };
};
