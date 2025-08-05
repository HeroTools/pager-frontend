import { notificationKeys } from '@/features/notifications/constants/query-keys';
import { useNotificationContext } from '@/features/notifications/hooks/use-notification-context';
import { useMarkNotificationAsRead } from '@/features/notifications/hooks/use-notifications-mutations';
import { browserNotificationService } from '@/features/notifications/services/browser-notification-service';
import type { NotificationEntity, NotificationsResponse } from '@/features/notifications/types';
import { type InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

type NotificationsInfiniteData = InfiniteData<NotificationsResponse, string | undefined>;

export const useFocusNotificationManager = () => {
  const queryClient = useQueryClient();
  const markAsReadMutation = useMarkNotificationAsRead();
  const { currentEntityId, workspaceId, isFocused, getNotificationsToMarkAsRead } =
    useNotificationContext();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const lastEntityRef = useRef<string | null>(null);

  const markCurrentEntityNotificationsAsRead = useCallback(async () => {
    if (!isFocused || !currentEntityId || !workspaceId || isProcessingRef.current) {
      return;
    }

    try {
      isProcessingRef.current = true;

      const notificationsData = queryClient.getQueryData<NotificationsInfiniteData>(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
      );

      if (!notificationsData?.pages) {
        return;
      }

      const allNotifications: NotificationEntity[] = [];
      notificationsData.pages.forEach((page) => {
        allNotifications.push(...page.notifications);
      });

      const unreadNotificationIds = getNotificationsToMarkAsRead(allNotifications);

      if (unreadNotificationIds.length > 0) {
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
    } finally {
      isProcessingRef.current = false;
    }
  }, [
    isFocused,
    currentEntityId,
    workspaceId,
    queryClient,
    getNotificationsToMarkAsRead,
    markAsReadMutation,
  ]);

  const debouncedMarkAsRead = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      markCurrentEntityNotificationsAsRead();
    }, 1000);
  }, [markCurrentEntityNotificationsAsRead]);

  useEffect(() => {
    const entityChanged = lastEntityRef.current !== currentEntityId;
    lastEntityRef.current = currentEntityId;

    if (isFocused && currentEntityId) {
      if (entityChanged) {
        debouncedMarkAsRead();
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isFocused, currentEntityId, debouncedMarkAsRead]);

  useEffect(() => {
    if (!isFocused || !workspaceId) {
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type === 'updated' &&
        event.query.queryKey[0] === notificationKeys.all[0] &&
        event.query.queryKey[1] === workspaceId
      ) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
          debouncedMarkAsRead();
        }, 2000);
      }
    });

    return () => {
      unsubscribe();
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isFocused, workspaceId, queryClient, debouncedMarkAsRead]);

  return {
    markCurrentEntityNotificationsAsRead,
  };
};
