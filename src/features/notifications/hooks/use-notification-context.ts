import type { NotificationEntity } from '@/features/notifications/types';
import { useBrowserFocus } from '@/hooks/use-browser-focus';
import { useParamIds } from '@/hooks/use-param-ids';
import { useCallback, useRef } from 'react';

export const useNotificationContext = () => {
  const { id: currentEntityId, type: currentEntityType, workspaceId } = useParamIds();
  const { isFocused } = useBrowserFocus();

  const processingRef = useRef(new Set<string>());

  const isNotificationForCurrentEntity = useCallback(
    (notification: NotificationEntity): boolean => {
      if (!currentEntityId) {
        return false;
      }

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

  const shouldShowBrowserNotification = useCallback((): boolean => {
    // Show browser notifications when tab is not focused
    return !isFocused;
  }, [isFocused]);

  const shouldShowToast = useCallback(
    (notification: NotificationEntity): boolean => {
      return !isFocused || !isNotificationForCurrentEntity(notification);
    },
    [isFocused, isNotificationForCurrentEntity],
  );

  const shouldCreateUnreadNotification = useCallback(
    (notification: NotificationEntity): boolean => {
      // Don't create unread if user is viewing the exact entity
      return !isFocused || !isNotificationForCurrentEntity(notification);
    },
    [isFocused, isNotificationForCurrentEntity],
  );

  const getNotificationsToMarkAsRead = useCallback(
    (notifications: NotificationEntity[]): string[] => {
      if (!isFocused || !currentEntityId || !notifications) {
        return [];
      }

      const toMark = notifications
        .filter(
          (notification) =>
            !notification.is_read &&
            isNotificationForCurrentEntity(notification) &&
            !processingRef.current.has(notification.id),
        )
        .map((notification) => notification.id);

      toMark.forEach((id) => processingRef.current.add(id));

      setTimeout(() => {
        toMark.forEach((id) => processingRef.current.delete(id));
      }, 5000);

      return toMark;
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
