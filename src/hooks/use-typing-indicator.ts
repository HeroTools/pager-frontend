import { supabase } from '@/lib/supabase/client';
import { TypingStatus } from '@/lib/utils/typing';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef, useState } from 'react';

interface UseTypingIndicatorProps {
  channelId?: string;
  conversationId?: string;
  currentUserId: string;
}

export const useTypingIndicator = ({
  channelId,
  conversationId,
  currentUserId,
}: UseTypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingStatus>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!channelId && !conversationId) {
      console.log('No channelId or conversationId provided');
      return;
    }

    const channelName = channelId ? `channel:${channelId}` : `conversation:${conversationId}`;
    console.log('Setting up typing indicator for channel:', channelName);

    // Clean up previous channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase.channel(channelName);

    channel.on('broadcast', { event: 'typing_status' }, (payload) => {
      console.log('Received typing status:', payload);

      const typingStatus = payload.payload as TypingStatus;

      // Don't show typing indicator for current user
      if (typingStatus.user_id === currentUserId) {
        console.log('Ignoring typing status from current user');
        return;
      }

      setTypingUsers((prev) => {
        const newMap = new Map(prev);

        if (typingStatus.is_typing) {
          console.log('User started typing:', typingStatus.user_id);
          newMap.set(typingStatus.user_id, typingStatus);
        } else {
          console.log('User stopped typing:', typingStatus.user_id);
          newMap.delete(typingStatus.user_id);
        }

        console.log('Updated typing users:', Array.from(newMap.keys()));
        return newMap;
      });
    });

    channel.subscribe((status) => {
      console.log('Channel subscription status:', status);
    });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up typing indicator channel');
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [channelId, conversationId, currentUserId]);

  const typingUsersList = Array.from(typingUsers.values());

  return {
    typingUsers: typingUsersList,
    isAnyoneTyping: typingUsersList.length > 0,
  };
};
