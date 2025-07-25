import { notificationKeys } from '@/features/notifications/constants/query-keys';
import { useNotificationContext } from '@/features/notifications/hooks/use-notification-context';
import { useMarkNotificationAsRead } from '@/features/notifications/hooks/use-notifications-mutations';
import { browserNotificationService } from '@/features/notifications/services/browser-notification-service';
import type { NotificationEntity, NotificationsResponse } from '@/features/notifications/types';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';

type NotificationsInfiniteData = InfiniteData<NotificationsResponse, string | undefined>;

export const useFocusNotificationManager = () => {
  const queryClient = useQueryClient();
  const markAsReadMutation = useMarkNotificationAsRead();
  const { currentEntityId, workspaceId, isFocused, getNotificationsToMarkAsRead } =
    useNotificationContext();

  const markCurrentEntityNotificationsAsRead = useCallback(async () => {
    if (!isFocused || !currentEntityId || !workspaceId) {
      return;
    }

    try {
      // Get all notifications from cache
      const notificationsData = queryClient.getQueryData<NotificationsInfiniteData>(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
      );

      if (!notificationsData?.pages) {
        return;
      }

      // Get all notifications from all pages
      const allNotifications: NotificationEntity[] = [];
      notificationsData.pages.forEach((page) => {
        allNotifications.push(...page.notifications);
      });

      // Use the context hook to determine which notifications to mark as read
      const unreadNotificationIds = getNotificationsToMarkAsRead(allNotifications);

      if (unreadNotificationIds.length > 0) {
        // Close browser notifications for these notifications
        unreadNotificationIds.forEach((id) => {
          browserNotificationService.closeNotification(id);
        });

        await markAsReadMutation.mutateAsync({
          notificationIds: unreadNotificationIds,
          workspaceId,
        });
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, [
    isFocused,
    currentEntityId,
    workspaceId,
    queryClient,
    getNotificationsToMarkAsRead,
    markAsReadMutation,
  ]);

  // Mark notifications as read when focus changes or entity changes
  useEffect(() => {
    if (isFocused && currentEntityId) {
      // Small delay to ensure data is settled
      const timer = setTimeout(() => {
        markCurrentEntityNotificationsAsRead();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isFocused, currentEntityId, markCurrentEntityNotificationsAsRead]);

  // Also mark notifications as read when new ones arrive and we're focused
  useEffect(() => {
    if (!isFocused || !workspaceId) {
      return;
    }

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === notificationKeys.all[0] &&
        event.query.queryKey[1] === workspaceId
      ) {
        // Debounce to avoid excessive calls
        setTimeout(() => {
          markCurrentEntityNotificationsAsRead();
        }, 1000);
      }
    });

    return unsubscribe;
  }, [isFocused, workspaceId, queryClient, markCurrentEntityNotificationsAsRead]);

  return {
    markCurrentEntityNotificationsAsRead,
  };
};
