import { supabase } from '@/lib/supabase/client';

export interface TypingStatus {
  user_id: string;
  is_typing: boolean;
  channel_id?: string;
  conversation_id?: string;
  timestamp: string;
}

const getTypingChannelName = (channelId?: string, conversationId?: string): string => {
  if (channelId) return `typing:channel:${channelId}`;
  if (conversationId) return `typing:conversation:${conversationId}`;
  throw new Error('Either channelId or conversationId must be provided');
};

/**
 * Broadcast the current user's typing status.
 */
export const broadcastTypingStatus = (
  userId: string,
  channelId?: string,
  conversationId?: string,
  isTyping = false,
): void => {
  const topic = getTypingChannelName(channelId, conversationId);
  const channel = supabase.channel(topic);

  channel
    .send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        user_id: userId,
        is_typing: isTyping,
        channel_id: channelId,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
      },
    })
    .then(({ error }) => {
      if (error) console.error('Failed to broadcast typing status:', error);
    });
};
