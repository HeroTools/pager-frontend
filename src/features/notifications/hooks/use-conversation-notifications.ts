import { useMemo } from 'react';
import { useNotifications } from './use-notifications';

export function useConversationNotifications(workspaceId: string) {
  const { data: notifications } = useNotifications({
    workspaceId,
    unreadOnly: false,
  });

  const conversationCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    notifications?.pages
      ?.flatMap((page) => page.notifications)
      .forEach((notification) => {
        if (!notification.is_read && notification.related_conversation_id) {
          const conversationId = notification.related_conversation_id;
          counts[conversationId] = (counts[conversationId] || 0) + 1;
        }
      });

    return counts;
  }, [notifications]);

  const getConversationUnreadCount = (conversationId: string): number => {
    return conversationCounts[conversationId] || 0;
  };

  const getTotalDMUnreadCount = (): number => {
    return Object.values(conversationCounts).reduce((sum, count) => sum + count, 0);
  };

  return {
    conversationCounts,
    getConversationUnreadCount,
    getTotalDMUnreadCount,
  };
}
