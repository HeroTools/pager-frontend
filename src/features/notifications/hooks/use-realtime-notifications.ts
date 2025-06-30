import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { InfiniteData } from "@tanstack/react-query";

import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import { notificationKeys } from "@/features/notifications/constants/query-keys";
import { useParamIds } from "@/hooks/use-param-ids";
import { useBrowserFocus } from "@/hooks/use-browser-focus";
import { useFocusNotificationManager } from "@/features/notifications/hooks/use-focus-notification-manager";
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

  const { id: currentEntityId, type: currentEntityType } = useParamIds();
  const { isFocused } = useBrowserFocus();

  // Initialize the focus notification manager
  useFocusNotificationManager();

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

        // Inline logic to determine notification behavior
        const isNotificationForCurrentEntity = () => {
          if (!currentEntityId) return false;

          if (currentEntityType === "channel") {
            return notification.related_channel_id === currentEntityId;
          }

          if (currentEntityType === "conversation") {
            return notification.related_conversation_id === currentEntityId;
          }

          return false;
        };

        const isForCurrentEntity = isNotificationForCurrentEntity();

        // Determine if we should create an unread notification
        const shouldCreateUnreadNotification =
          !isFocused || !isForCurrentEntity;

        // Always show toast unless we're focused and it's for the current entity
        const shouldShowToast = !isFocused || !isForCurrentEntity;

        // Show toast if appropriate
        if (shouldShowToast) {
          toast.info(notification.title, {
            description: notification.message,
          });
        }

        // Create notification entry (read or unread based on context)
        const notificationToStore = shouldCreateUnreadNotification
          ? notification
          : {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            };

        // Update main notifications list
        queryClient.setQueryData<NotificationsInfiniteData>(
          getNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) {
              return {
                pages: [
                  {
                    notifications: [notificationToStore],
                    pagination: {
                      limit: 50,
                      cursor: null,
                      nextCursor: null,
                      hasMore: false,
                    },
                    unread_count: notificationToStore.is_read ? 0 : 1,
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
              notifications: [notificationToStore, ...firstPage.notifications],
              unread_count:
                firstPage.unread_count + (notificationToStore.is_read ? 0 : 1),
            };

            return { ...old, pages: newPages };
          }
        );

        // Update unread notifications list (only if notification is unread)
        if (!notificationToStore.is_read) {
          queryClient.setQueryData<NotificationsInfiniteData>(
            getUnreadNotificationsQueryKey(),
            (old) => {
              if (!old?.pages?.length) {
                return {
                  pages: [
                    {
                      notifications: [notificationToStore],
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
                notifications: [
                  notificationToStore,
                  ...firstPage.notifications,
                ],
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

        // Log the decision for debugging
        console.log("Notification handling decision:", {
          notificationId: notification.id,
          shouldCreateUnreadNotification,
          shouldShowToast,
          isForCurrentEntity,
          isFocused,
          currentEntityId,
          currentEntityType,
          finalNotificationState: notificationToStore.is_read
            ? "read"
            : "unread",
        });
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
  }, [
    workspaceMemberId,
    workspaceId,
    enabled,
    currentEntityId,
    currentEntityType,
    isFocused,
  ]);

  return {
    isConnected,
    connectionStatus,
    topic,
  };
};
