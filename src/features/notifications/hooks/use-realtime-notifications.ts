import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InfiniteData } from "@tanstack/react-query";

import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import { notificationKeys } from "@/features/notifications/constants/query-keys";
import type {
  NotificationEntity,
  NotificationsResponse,
} from "@/features/notifications/types";

interface UseRealtimeNotificationsProps {
  workspaceMemberId: string;
  workspaceId: string;
  enabled?: boolean;
}

type NotificationsInfiniteData = InfiniteData<
  NotificationsResponse,
  string | undefined
>;
type ConnectionStatus =
  | "CONNECTING"
  | "SUBSCRIBED"
  | "CHANNEL_ERROR"
  | "CLOSED"
  | "TIMED_OUT";

interface NewNotificationPayload {
  notification: NotificationEntity;
}

interface NotificationReadPayload {
  notificationId: string;
  isRead: boolean;
}

export const useRealtimeNotifications = ({
  workspaceMemberId,
  workspaceId,
  enabled = true,
}: UseRealtimeNotificationsProps) => {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("CONNECTING");

  const topic = `workspace_member:${workspaceMemberId}`;

  const getNotificationsQueryKey = () =>
    notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false });

  const getUnreadNotificationsQueryKey = () =>
    notificationKeys.unread(workspaceId);

  useEffect(() => {
    if (!enabled || !workspaceMemberId || !workspaceId) return;

    setConnectionStatus("CONNECTING");

    const handleNewNotification = (payload: NewNotificationPayload) => {
      try {
        const notification = payload.notification;

        console.log("New notification received:", notification);

        // Update main notifications list
        queryClient.setQueryData<NotificationsInfiniteData>(
          getNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) {
              return {
                pages: [
                  {
                    notifications: [notification],
                    pagination: {
                      limit: 50,
                      cursor: null,
                      nextCursor: null,
                      hasMore: false,
                    },
                    unread_count: notification.is_read ? 0 : 1,
                  },
                ],
                pageParams: [undefined],
              };
            }

            // Check if notification already exists
            const exists = old.pages.some((page) =>
              page.notifications.some((n) => n.id === notification.id)
            );
            if (exists) return old;

            // Add to first page
            const newPages = [...old.pages];
            const firstPage = newPages[0];

            newPages[0] = {
              ...firstPage,
              notifications: [notification, ...firstPage.notifications],
              unread_count:
                firstPage.unread_count + (notification.is_read ? 0 : 1),
            };

            return { ...old, pages: newPages };
          }
        );

        // Update unread notifications list (only if notification is unread)
        if (!notification.is_read) {
          queryClient.setQueryData<NotificationsInfiniteData>(
            getUnreadNotificationsQueryKey(),
            (old) => {
              if (!old?.pages?.length) {
                return {
                  pages: [
                    {
                      notifications: [notification],
                      pagination: {
                        limit: 50,
                        cursor: null,
                        nextCursor: null,
                        hasMore: false,
                      },
                      unread_count: 1,
                    },
                  ],
                  pageParams: [undefined],
                };
              }

              // Check if notification already exists
              const exists = old.pages.some((page) =>
                page.notifications.some((n) => n.id === notification.id)
              );
              if (exists) return old;

              // Add to first page
              const newPages = [...old.pages];
              const firstPage = newPages[0];

              newPages[0] = {
                ...firstPage,
                notifications: [notification, ...firstPage.notifications],
                unread_count: firstPage.unread_count + 1,
              };

              return { ...old, pages: newPages };
            }
          );

          // Update unread count
          queryClient.setQueryData<{ unread_count: number }>(
            notificationKeys.unreadCount(workspaceId),
            (old) => ({
              unread_count: (old?.unread_count || 0) + 1,
            })
          );
        }

        // Show toast notification when app is not focused
        if (document.hidden || !document.hasFocus()) {
          toast.info(notification.title, {
            description: notification.message,
          });
        }
      } catch (error) {
        console.error("Error handling new notification:", error);
      }
    };

    const handleNotificationRead = (payload: NotificationReadPayload) => {
      try {
        const { notificationId, isRead } = payload;

        console.log("Notification read status updated:", {
          notificationId,
          isRead,
        });

        // Update main notifications list
        queryClient.setQueryData<NotificationsInfiniteData>(
          getNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;

            const newPages = old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notification) =>
                notification.id === notificationId
                  ? {
                      ...notification,
                      is_read: isRead,
                      read_at: isRead ? new Date().toISOString() : null,
                    }
                  : notification
              ),
            }));

            return { ...old, pages: newPages };
          }
        );

        // If marked as read, remove from unread list
        if (isRead) {
          queryClient.setQueryData<NotificationsInfiniteData>(
            getUnreadNotificationsQueryKey(),
            (old) => {
              if (!old?.pages?.length) return old;

              const newPages = old.pages.map((page) => ({
                ...page,
                notifications: page.notifications.filter(
                  (notification) => notification.id !== notificationId
                ),
                unread_count: Math.max(0, page.unread_count - 1),
              }));

              return { ...old, pages: newPages };
            }
          );

          // Update unread count
          queryClient.setQueryData<{ unread_count: number }>(
            notificationKeys.unreadCount(workspaceId),
            (old) => ({
              unread_count: Math.max(0, (old?.unread_count || 0) - 1),
            })
          );
        }
      } catch (error) {
        console.error("Error handling notification read status:", error);
      }
    };

    const handleAllNotificationsRead = () => {
      try {
        console.log(
          "All notifications marked as read for workspace:",
          workspaceId
        );

        const now = new Date().toISOString();

        // Update main notifications list - mark all as read
        queryClient.setQueryData<NotificationsInfiniteData>(
          getNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;

            const newPages = old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notification) => ({
                ...notification,
                is_read: true,
                read_at: now,
              })),
              unread_count: 0,
            }));

            return { ...old, pages: newPages };
          }
        );

        // Clear unread notifications list
        queryClient.setQueryData<NotificationsInfiniteData>(
          getUnreadNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;

            const newPages = old.pages.map((page) => ({
              ...page,
              notifications: [],
              unread_count: 0,
            }));

            return { ...old, pages: newPages };
          }
        );

        // Reset unread count
        queryClient.setQueryData<{ unread_count: number }>(
          notificationKeys.unreadCount(workspaceId),
          { unread_count: 0 }
        );
      } catch (error) {
        console.error("Error handling all notifications read:", error);
      }
    };

    const handleConnectionError = (error: any) => {
      console.error("Realtime connection error:", error);
      setConnectionStatus("CHANNEL_ERROR");
      setIsConnected(false);
    };

    const handleStatusChange = (status: string) => {
      const connectionStatus = status as ConnectionStatus;
      setConnectionStatus(connectionStatus);
      setIsConnected(connectionStatus === "SUBSCRIBED");

      if (
        connectionStatus === "CHANNEL_ERROR" ||
        connectionStatus === "TIMED_OUT"
      ) {
        console.warn(
          `Notification subscription ${connectionStatus.toLowerCase()}:`,
          topic
        );
      }
    };

    try {
      subscriptionManager.subscribeBroadcast(
        topic,
        "new_notification",
        handleNewNotification
      );

      subscriptionManager.subscribeBroadcast(
        topic,
        "notification_read",
        handleNotificationRead
      );

      subscriptionManager.subscribeBroadcast(
        topic,
        "all_notifications_read",
        handleAllNotificationsRead
      );

      subscriptionManager.onStatusChange(topic, handleStatusChange);
    } catch (error) {
      console.error("Error setting up notification subscriptions:", error);
      setConnectionStatus("CHANNEL_ERROR");
    }

    return () => {
      try {
        subscriptionManager.unsubscribe(topic);
        subscriptionManager.offStatusChange(topic, handleStatusChange);
      } catch (error) {
        console.error("Error cleaning up notification subscriptions:", error);
      }
    };
  }, [workspaceMemberId, workspaceId, enabled]);

  return {
    isConnected,
    connectionStatus,
    topic,
  };
};
