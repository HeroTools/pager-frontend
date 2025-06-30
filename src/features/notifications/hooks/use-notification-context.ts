import { useCallback } from "react";
import { useParamIds } from "@/hooks/use-param-ids";
import { useBrowserFocus } from "@/hooks/use-browser-focus";
import type { NotificationEntity } from "@/features/notifications/types";

export const useNotificationContext = () => {
  const {
    id: currentEntityId,
    type: currentEntityType,
    workspaceId,
  } = useParamIds();
  const { isFocused } = useBrowserFocus();

  const isNotificationForCurrentEntity = useCallback(
    (notification: NotificationEntity): boolean => {
      if (!currentEntityId) return false;

      if (currentEntityType === "channel") {
        return notification.related_channel_id === currentEntityId;
      }

      if (currentEntityType === "conversation") {
        return notification.related_conversation_id === currentEntityId;
      }

      return false;
    },
    [currentEntityId, currentEntityType]
  );

  const shouldShowNotification = useCallback(
    (notification: NotificationEntity): boolean => {
      // Always show notification if browser is not focused
      if (!isFocused) {
        return true;
      }

      // If browser is focused, only show notification if it's NOT for the current entity
      return !isNotificationForCurrentEntity(notification);
    },
    [isFocused, isNotificationForCurrentEntity]
  );

  const shouldShowToast = useCallback(
    (notification: NotificationEntity): boolean => {
      // Show toast if browser is not focused
      if (!isFocused) {
        return true;
      }

      // If browser is focused and notification is for current entity, show toast but no notification badge
      if (isNotificationForCurrentEntity(notification)) {
        return true;
      }

      // If browser is focused but notification is for different entity, show both notification and toast
      return true;
    },
    [isFocused, isNotificationForCurrentEntity]
  );

  const getNotificationsToMarkAsRead = useCallback(
    (notifications: NotificationEntity[]): string[] => {
      if (!isFocused || !currentEntityId) return [];

      return notifications
        .filter(
          (notification) =>
            !notification.is_read &&
            isNotificationForCurrentEntity(notification)
        )
        .map((notification) => notification.id);
    },
    [isFocused, currentEntityId, isNotificationForCurrentEntity]
  );

  return {
    currentEntityId,
    currentEntityType,
    workspaceId,
    isFocused,
    isNotificationForCurrentEntity,
    shouldShowNotification,
    shouldShowToast,
    getNotificationsToMarkAsRead,
  };
};
