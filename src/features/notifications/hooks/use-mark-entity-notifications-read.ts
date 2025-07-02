import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMarkNotificationAsRead } from "@/features/notifications/hooks/use-notifications-mutations";
import { notificationsApi } from "@/features/notifications/api/notifications-api";
import { notificationKeys } from "@/features/notifications/constants/query-keys";
import type {
  NotificationsResponse,
  NotificationEntity,
} from "@/features/notifications/types";
import type { InfiniteData } from "@tanstack/react-query";

type NotificationsInfiniteData = InfiniteData<
  NotificationsResponse,
  string | undefined
>;

export const useMarkEntityNotificationsRead = () => {
  const queryClient = useQueryClient();
  const markNotificationAsRead = useMarkNotificationAsRead();

  const markEntityNotificationsRead = useCallback(
    async (
      workspaceId: string,
      entityId: string,
      entityType: "channel" | "conversation"
    ) => {
      try {
        // Get current notifications from cache
        const notificationsData =
          queryClient.getQueryData<NotificationsInfiniteData>(
            notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false })
          );

        if (!notificationsData?.pages?.length) return { markedCount: 0 };

        // Collect all notifications from all pages
        const allNotifications: NotificationEntity[] = [];
        notificationsData.pages.forEach((page) => {
          allNotifications.push(...page.notifications);
        });

        // Filter notifications for this specific entity that are unread
        const entityNotificationsToMarkAsRead = allNotifications.filter(
          (notification) => {
            if (notification.is_read) return false;

            if (entityType === "channel") {
              return notification.related_channel_id === entityId;
            }

            if (entityType === "conversation") {
              return notification.related_conversation_id === entityId;
            }

            return false;
          }
        );

        if (entityNotificationsToMarkAsRead.length === 0) {
          return { markedCount: 0 };
        }

        const notificationIdsToMarkAsRead = entityNotificationsToMarkAsRead.map(
          (n) => n.id
        );
        const countToDecrease = entityNotificationsToMarkAsRead.length;

        console.log(
          `Marking ${countToDecrease} notifications as read for ${entityType}:${entityId}`
        );

        // Optimistically update the count BEFORE making API calls
        const previousUnreadCount = queryClient.getQueryData<{
          unread_count: number;
        }>(notificationKeys.unreadCount(workspaceId));

        if (previousUnreadCount) {
          queryClient.setQueryData<{ unread_count: number }>(
            notificationKeys.unreadCount(workspaceId),
            {
              unread_count: Math.max(
                0,
                previousUnreadCount.unread_count - countToDecrease
              ),
            }
          );
        }

        // Optimistically update the notifications in cache
        const now = new Date().toISOString();

        // Update main notifications list
        queryClient.setQueryData<NotificationsInfiniteData>(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
          (old) => {
            if (!old?.pages?.length) return old;

            const newPages = old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notification) =>
                notificationIdsToMarkAsRead.includes(notification.id)
                  ? {
                      ...notification,
                      is_read: true,
                      read_at: now,
                    }
                  : notification
              ),
              unread_count: Math.max(0, page.unread_count - countToDecrease),
            }));

            return { ...old, pages: newPages };
          }
        );

        // Update unread notifications list
        queryClient.setQueryData<NotificationsInfiniteData>(
          notificationKeys.unread(workspaceId),
          (old) => {
            if (!old?.pages?.length) return old;

            const newPages = old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.filter(
                (notification) =>
                  !notificationIdsToMarkAsRead.includes(notification.id)
              ),
              unread_count: Math.max(0, page.unread_count - countToDecrease),
            }));

            return { ...old, pages: newPages };
          }
        );

        try {
          notificationsApi.markNotificationAsRead(
            workspaceId,
            notificationIdsToMarkAsRead
          );

          return { markedCount: countToDecrease };
        } catch (error) {
          if (previousUnreadCount) {
            queryClient.setQueryData<{ unread_count: number }>(
              notificationKeys.unreadCount(workspaceId),
              previousUnreadCount
            );
          }

          queryClient.invalidateQueries({
            queryKey: notificationKeys.workspace(workspaceId),
          });

          throw error;
        }
      } catch (error) {
        console.error("Error marking entity notifications as read:", error);
        throw error;
      }
    },
    [queryClient, markNotificationAsRead]
  );

  return {
    markEntityNotificationsRead,
    isLoading: markNotificationAsRead.isPending,
  };
};
