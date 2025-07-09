import { supabase } from '@/lib/supabase/client';
import type { TypingStatus } from '@/lib/utils/typing';
import { useEffect, useState } from 'react';

interface UseTypingIndicatorProps {
  channelId?: string;
  conversationId?: string;
  currentUserId: string;
}

/**
 * Hook for listening to typing events from other users.
 */
export const useTypingIndicator = ({
  channelId,
  conversationId,
  currentUserId,
}: UseTypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<TypingStatus[]>([]);

  useEffect(() => {
    if (!channelId && !conversationId) return;

    const topic = channelId
      ? `typing:channel:${channelId}`
      : `typing:conversation:${conversationId}`;
    const channel = supabase.channel(topic, { config: { broadcast: { self: false } } });

    channel
      .on('broadcast', { event: 'typing_status' }, ({ payload }) => {
        const status = payload as TypingStatus;
        if (status.user_id === currentUserId) return;

        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.user_id === status.user_id);

          if (status.is_typing) {
            if (exists) {
              return prev.map((u) => (u.user_id === status.user_id ? status : u));
            }
            return [...prev, status];
          } else {
            return prev.filter((u) => u.user_id !== status.user_id);
          }
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setTypingUsers([]);
    };
  }, [channelId, conversationId, currentUserId]);

  return {
    typingUsers,
    isAnyoneTyping: typingUsers.length > 0,
  };
};
