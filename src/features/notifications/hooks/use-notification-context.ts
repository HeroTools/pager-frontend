import { useCallback } from 'react';
import { useParamIds } from '@/hooks/use-param-ids';
import { useBrowserFocus } from '@/hooks/use-browser-focus';
import type { NotificationEntity } from '@/features/notifications/types';

export const useNotificationContext = () => {
  const { id: currentEntityId, type: currentEntityType, workspaceId } = useParamIds();
  const { isFocused } = useBrowserFocus();

  const isNotificationForCurrentEntity = useCallback(
    (notification: NotificationEntity): boolean => {
      if (!currentEntityId) return false;

      if (currentEntityType === 'channel') {
        return notification.related_channel_id === currentEntityId;
      }

      if (currentEntityType === 'conversation') {
        return notification.related_conversation_id === currentEntityId;
      }

      return false;
    },
    [currentEntityId, currentEntityType],
  );

  // browser notifications should show when tab not focused
  const shouldShowBrowserNotification = useCallback((): boolean => {
    return !isFocused;
  }, [isFocused]);

  // Toast notifications should show when not focused OR not for current entity
  const shouldShowToast = useCallback(
    (notification: NotificationEntity): boolean => {
      return !isFocused || !isNotificationForCurrentEntity(notification);
    },
    [isFocused, isNotificationForCurrentEntity],
  );

  // Notifications should be marked as unread unless we're focused on the entity they're for
  const shouldCreateUnreadNotification = useCallback(
    (notification: NotificationEntity): boolean => {
      return !isFocused || !isNotificationForCurrentEntity(notification);
    },
    [isFocused, isNotificationForCurrentEntity],
  );

  const getNotificationsToMarkAsRead = useCallback(
    (notifications: NotificationEntity[]): string[] => {
      if (!isFocused || !currentEntityId) return [];

      return notifications
        .filter(
          (notification) => !notification.is_read && isNotificationForCurrentEntity(notification),
        )
        .map((notification) => notification.id);
    },
    [isFocused, currentEntityId, isNotificationForCurrentEntity],
  );

  return {
    currentEntityId,
    currentEntityType,
    workspaceId,
    isFocused,
    isNotificationForCurrentEntity,
    shouldShowBrowserNotification,
    shouldShowToast,
    shouldCreateUnreadNotification,
    getNotificationsToMarkAsRead,
  };
};
