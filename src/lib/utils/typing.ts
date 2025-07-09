import { supabase } from '@/lib/supabase/client';

export interface TypingStatus {
  user_id: string;
  is_typing: boolean;
  channel_id?: string;
  conversation_id?: string;
  timestamp: string;
}

export const broadcastTypingStatus = async (
  userId: string,
  channelId?: string,
  conversationId?: string,
  isTyping = false,
) => {
  try {
    const realtimeChannel = channelId ? `channel:${channelId}` : `conversation:${conversationId}`;

    const channel = supabase.channel(realtimeChannel);

    await channel.send({
      type: 'broadcast',
      event: 'typing_status',
      payload: {
        user_id: userId,
        is_typing: isTyping,
        channel_id: channelId,
        conversation_id: conversationId,
        timestamp: new Date().toISOString(),
      } as TypingStatus,
    });
  } catch (error) {
    console.error('Failed to broadcast typing status:', error);
  }
};
