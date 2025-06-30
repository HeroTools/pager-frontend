import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import { useNotificationContext } from "./use-notification-context";
import { useMarkNotificationAsRead } from "@/features/notifications/hooks/use-notifications-mutations";
import { notificationKeys } from "@/features/notifications/constants/query-keys";
import type {
  NotificationsResponse,
  NotificationEntity,
} from "@/features/notifications/types";

type NotificationsInfiniteData = InfiniteData<
  NotificationsResponse,
  string | undefined
>;

export const useFocusNotificationManager = () => {
  const queryClient = useQueryClient();
  const { workspaceId, isFocused, getNotificationsToMarkAsRead } =
    useNotificationContext();

  const markNotificationAsRead = useMarkNotificationAsRead();
  const previousFocusState = useRef(isFocused);

  useEffect(() => {
    if (isFocused && !previousFocusState.current && workspaceId) {
      handleFocusRegained();
    }

    previousFocusState.current = isFocused;
  }, [isFocused, workspaceId]);

  const handleFocusRegained = async () => {
    try {
      const notificationsData =
        queryClient.getQueryData<NotificationsInfiniteData>(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false })
        );

      if (!notificationsData?.pages?.length) return;

      const allNotifications: NotificationEntity[] = [];
      notificationsData.pages.forEach((page) => {
        allNotifications.push(...page.notifications);
      });

      const notificationIdsToMarkAsRead =
        getNotificationsToMarkAsRead(allNotifications);

      if (notificationIdsToMarkAsRead.length === 0) return;

      markNotificationAsRead.mutate({
        notificationIds: notificationIdsToMarkAsRead,
        workspaceId,
      });
    } catch (error) {
      console.error("Error marking notifications as read on focus:", error);
    }
  };

  return {
    isMarkingAsRead: markNotificationAsRead.isPending,
  };
};
