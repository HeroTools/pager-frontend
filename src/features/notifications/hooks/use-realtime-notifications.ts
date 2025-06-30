import { useEffect, useState, useRef, useCallback } from "react";
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
  const [connectionInfo, setConnectionInfo] = useState({
    reconnectAttempts: 0,
    circuitBreakerOpen: false,
    lastActivity: Date.now(),
  });

  const lastStatusRef = useRef<string>("CONNECTING");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const processedNotificationsRef = useRef<Map<string, number>>(new Map()); // ID -> timestamp

  const { id: currentEntityId, type: currentEntityType } = useParamIds();
  const { isFocused } = useBrowserFocus();

  useFocusNotificationManager();

  const topic = `workspace_member:${workspaceMemberId}`;

  const getNotificationsQueryKey = useCallback(
    () => notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
    [workspaceId]
  );

  const getUnreadNotificationsQueryKey = useCallback(
    () => notificationKeys.unread(workspaceId),
    [workspaceId]
  );

  const isNotificationForCurrentEntity = useCallback(
    (notification: NotificationEntity) => {
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

  useEffect(() => {
    if (!enabled || !workspaceMemberId || !workspaceId) return;

    setConnectionStatus("CONNECTING");
    setConnectionInfo((prev) => ({
      ...prev,
      reconnectAttempts: 0,
      circuitBreakerOpen: false,
    }));

    // Clear old processed notifications (older than 5 minutes)
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    processedNotificationsRef.current.forEach((timestamp, id) => {
      if (now - timestamp > FIVE_MINUTES) {
        processedNotificationsRef.current.delete(id);
      }
    });

    const handleNewNotification = (payload: NewNotificationPayload) => {
      try {
        const notification = payload.notification;
        const now = Date.now();
        const DUPLICATE_WINDOW = 30 * 1000; // 30 seconds

        // Check for recent duplicates (within 30 seconds)
        const lastProcessed = processedNotificationsRef.current.get(
          notification.id
        );
        if (lastProcessed && now - lastProcessed < DUPLICATE_WINDOW) {
          console.log(
            `Duplicate notification ${notification.id} ignored (processed ${
              now - lastProcessed
            }ms ago)`
          );
          return;
        }

        // Record this notification processing time
        processedNotificationsRef.current.set(notification.id, now);

        // Clean up old entries periodically (keep only last 50 entries)
        if (processedNotificationsRef.current.size > 50) {
          const entries = Array.from(
            processedNotificationsRef.current.entries()
          )
            .sort((a, b) => b[1] - a[1]) // Sort by timestamp, newest first
            .slice(0, 25); // Keep newest 25
          processedNotificationsRef.current = new Map(entries);
        }

        console.log("New notification received:", {
          id: notification.id,
          title: notification.title,
          timestamp: new Date(
            notification.created_at || Date.now()
          ).toLocaleTimeString(),
          cacheSize: processedNotificationsRef.current.size,
        });
        setConnectionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));

        const isForCurrentEntity = isNotificationForCurrentEntity(notification);
        const shouldCreateUnreadNotification =
          !isFocused || !isForCurrentEntity;
        const shouldShowToast = !isFocused || !isForCurrentEntity;

        if (shouldShowToast) {
          toast.info(notification.title, {
            description: notification.message,
          });
        }

        const notificationToStore = shouldCreateUnreadNotification
          ? notification
          : {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            };

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

            const exists = old.pages.some((page) =>
              page.notifications.some((n) => n.id === notification.id)
            );
            if (exists) return old;

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

              const exists = old.pages.some((page) =>
                page.notifications.some((n) => n.id === notification.id)
              );
              if (exists) return old;

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

          queryClient.setQueryData<{ unread_count: number }>(
            notificationKeys.unreadCount(workspaceId),
            (old) => ({
              unread_count: (old?.unread_count || 0) + 1,
            })
          );
        }

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
        setConnectionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));

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
        setConnectionInfo((prev) => ({ ...prev, lastActivity: Date.now() }));

        const now = new Date().toISOString();

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

        queryClient.setQueryData<{ unread_count: number }>(
          notificationKeys.unreadCount(workspaceId),
          { unread_count: 0 }
        );
      } catch (error) {
        console.error("Error handling all notifications read:", error);
      }
    };

    const handleStatusChange = (status: string) => {
      // Prevent rapid status updates
      if (lastStatusRef.current === status) return;
      lastStatusRef.current = status;

      const connectionStatus = status as ConnectionStatus;
      setConnectionStatus(connectionStatus);
      setIsConnected(connectionStatus === "SUBSCRIBED");

      // Update connection info based on subscription manager state
      const health = subscriptionManager.getConnectionHealth();
      const notificationState = health.channelStates.find(
        (ch) => ch.topic === topic
      );

      if (notificationState) {
        setConnectionInfo((prev) => ({
          ...prev,
          reconnectAttempts: notificationState.reconnectAttempts,
          circuitBreakerOpen:
            notificationState.circuitBreakerOpen ||
            health.globalCircuitBreakerOpen,
        }));
      }

      // Clear any pending manual reconnection attempts on successful connection
      if (connectionStatus === "SUBSCRIBED") {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
        // Clean up very old processed notifications on successful reconnection (older than 1 minute)
        const now = Date.now();
        const ONE_MINUTE = 60 * 1000;
        processedNotificationsRef.current.forEach((timestamp, id) => {
          if (now - timestamp > ONE_MINUTE) {
            processedNotificationsRef.current.delete(id);
          }
        });
      }

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
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

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
    getNotificationsQueryKey,
    getUnreadNotificationsQueryKey,
    isNotificationForCurrentEntity,
  ]);

  // Manual reconnect function with built-in cooldown
  const forceReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      console.log(
        "Reconnection already in progress, skipping manual reconnect"
      );
      return;
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      subscriptionManager.forceReconnect(topic);
      reconnectTimeoutRef.current = undefined;
    }, 1000);
  }, [topic]);

  // Get current connection health
  const getConnectionHealth = useCallback(() => {
    const health = subscriptionManager.getConnectionHealth();
    const notificationState = health.channelStates.find(
      (ch) => ch.topic === topic
    );

    return {
      ...health,
      notificationState: notificationState || null,
    };
  }, [topic]);

  // Clear duplicate cache (useful for debugging)
  const clearDuplicateCache = useCallback(() => {
    console.log(
      `Clearing duplicate notification cache (had ${processedNotificationsRef.current.size} entries)`
    );
    processedNotificationsRef.current.clear();
  }, []);

  // Get duplicate cache info (useful for debugging)
  const getDuplicateCacheInfo = useCallback(() => {
    const now = Date.now();
    const entries = Array.from(processedNotificationsRef.current.entries()).map(
      ([id, timestamp]) => ({
        id,
        ageMs: now - timestamp,
        ageSeconds: Math.round((now - timestamp) / 1000),
      })
    );

    return {
      size: processedNotificationsRef.current.size,
      entries: entries.sort((a, b) => a.ageMs - b.ageMs), // Sort by age, newest first
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    connectionInfo,
    topic,
    forceReconnect,
    getConnectionHealth,
    clearDuplicateCache,
    getDuplicateCacheInfo,
  };
};
