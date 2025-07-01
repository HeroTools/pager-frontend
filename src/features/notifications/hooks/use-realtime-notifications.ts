import { useEffect, useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { InfiniteData } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  notificationsRealtimeHandler,
  RealtimeHandler,
} from "@/lib/realtime/realtime-handler";
import { supabase } from "@/lib/supabase/client";
import { browserNotificationService } from "@/features/notifications/services/browser-notification-service";
import { notificationKeys } from "@/features/notifications/constants/query-keys";
import { useFocusNotificationManager } from "@/features/notifications/hooks/use-focus-notification-manager";
import { useNotificationPermissions } from "@/features/notifications/hooks/use-notification-permissions";
import { useNotificationContext } from "@/features/notifications/hooks/use-notification-context";
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
  const router = useRouter();

  // connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("CONNECTING");

  // refs
  const realtimeHandlerRef = useRef<RealtimeHandler<typeof supabase> | null>(
    null
  );
  const processedNotificationsRef = useRef<Map<string, number>>(new Map());
  const cleanupFnRef = useRef<(() => void) | null>(null);

  // permissions & context
  const { permission: notificationPermission } = useNotificationPermissions();
  const {
    shouldShowBrowserNotification,
    shouldShowToast,
    shouldCreateUnreadNotification,
  } = useNotificationContext();

  useFocusNotificationManager();

  // topic & query-key factories
  const topic = `workspace_member:${workspaceMemberId}`;

  const getNotificationsQueryKey = useCallback(
    () => notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
    [workspaceId]
  );
  const getUnreadNotificationsQueryKey = useCallback(
    () => notificationKeys.unread(workspaceId),
    [workspaceId]
  );

  // click handler
  const handleNotificationClick = useCallback(
    (notification: NotificationEntity) => {
      if (notification.related_channel_id) {
        router.push(`/${workspaceId}/c-${notification.related_channel_id}`);
      } else if (notification.related_conversation_id) {
        router.push(
          `/${workspaceId}/d-${notification.related_conversation_id}`
        );
      }
    },
    [workspaceId, router]
  );

  // ── Notification handlers: always latest logic via ref
  const handlersRef = useRef({
    handleNewNotification: (payload: NewNotificationPayload) => {},
    handleNotificationRead: (payload: NotificationReadPayload) => {},
    handleAllNotificationsRead: () => {},
  });

  // 1) NEW NOTIFICATION
  const handleNewNotification = useCallback(
    async (payload: NewNotificationPayload) => {
      try {
        const notification = payload.notification;
        const now = Date.now();
        const DUPLICATE_WINDOW = 30 * 1000; // 30s

        // dedupe
        const last = processedNotificationsRef.current.get(notification.id);
        if (last && now - last < DUPLICATE_WINDOW) {
          console.log(`🔄 Duplicate notification ${notification.id} ignored`);
          return;
        }
        processedNotificationsRef.current.set(notification.id, now);

        // prune old
        if (processedNotificationsRef.current.size > 50) {
          const entries = Array.from(
            processedNotificationsRef.current.entries()
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 25);
          processedNotificationsRef.current = new Map(entries);
        }

        // Display logic
        const showBrowser = shouldShowBrowserNotification(notification);
        const showToastFlag = shouldShowToast(notification);
        const storeUnread = shouldCreateUnreadNotification(notification);

        // browser notify
        if (showBrowser && notificationPermission === "granted") {
          await browserNotificationService.showNotification({
            notification,
            workspaceId,
            onClickCallback: () => handleNotificationClick(notification),
          });
        }

        // toast
        if (showToastFlag) {
          toast.info(notification.title, {
            description: notification.message,
            action: {
              label: "View",
              onClick: () => handleNotificationClick(notification),
            },
          });
        }

        // prepare for cache
        const toStore = storeUnread
          ? notification
          : {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            };

        // update main list
        queryClient.setQueryData<NotificationsInfiniteData>(
          getNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) {
              return {
                pages: [
                  {
                    notifications: [toStore],
                    pagination: {
                      limit: 50,
                      cursor: null,
                      nextCursor: null,
                      hasMore: false,
                    },
                    unread_count: toStore.is_read ? 0 : 1,
                  },
                ],
                pageParams: [undefined],
              };
            }
            const exists = old.pages[0].notifications.some(
              (n) => n.id === notification.id
            );
            if (exists) return old;
            const first = old.pages[0];
            const updatedFirst = {
              ...first,
              notifications: [toStore, ...first.notifications],
              unread_count: first.unread_count + (toStore.is_read ? 0 : 1),
            };
            return { ...old, pages: [updatedFirst, ...old.pages.slice(1)] };
          }
        );

        // update unread list & count
        if (!toStore.is_read) {
          queryClient.setQueryData<NotificationsInfiniteData>(
            getUnreadNotificationsQueryKey(),
            (old) => {
              if (!old?.pages?.length) {
                return {
                  pages: [
                    {
                      notifications: [toStore],
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
              const exists = old.pages[0].notifications.some(
                (n) => n.id === notification.id
              );
              if (exists) return old;
              const first = old.pages[0];
              const updatedFirst = {
                ...first,
                notifications: [toStore, ...first.notifications],
                unread_count: first.unread_count + 1,
              };
              return { ...old, pages: [updatedFirst, ...old.pages.slice(1)] };
            }
          );
          queryClient.setQueryData<{ unread_count: number }>(
            notificationKeys.unreadCount(workspaceId),
            (old) => ({ unread_count: (old?.unread_count || 0) + 1 })
          );
        }
      } catch (err) {
        console.error("❌ Error handling new notification:", err);
      }
    },
    [
      shouldShowBrowserNotification,
      shouldShowToast,
      shouldCreateUnreadNotification,
      notificationPermission,
      handleNotificationClick,
      workspaceId,
      getNotificationsQueryKey,
      getUnreadNotificationsQueryKey,
      queryClient,
    ]
  );

  // 2) READ STATUS UPDATE
  const handleNotificationRead = useCallback(
    (payload: NotificationReadPayload) => {
      try {
        const { notificationId, isRead } = payload;

        if (isRead)
          browserNotificationService.closeNotification(notificationId);

        // update main list
        queryClient.setQueryData<NotificationsInfiniteData>(
          getNotificationsQueryKey(),
          (old) => {
            if (!old?.pages?.length) return old;
            const newPages = old.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((n) =>
                n.id === notificationId
                  ? {
                      ...n,
                      is_read: isRead,
                      read_at: isRead ? new Date().toISOString() : null,
                    }
                  : n
              ),
            }));
            return { ...old, pages: newPages };
          }
        );

        // update unread list & count
        if (isRead) {
          queryClient.setQueryData<NotificationsInfiniteData>(
            getUnreadNotificationsQueryKey(),
            (old) => {
              if (!old?.pages?.length) return old;
              const newPages = old.pages.map((page) => ({
                ...page,
                notifications: page.notifications.filter(
                  (n) => n.id !== notificationId
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
      } catch (err) {
        console.error("❌ Error handling notification read:", err);
      }
    },
    [
      getNotificationsQueryKey,
      getUnreadNotificationsQueryKey,
      queryClient,
      workspaceId,
    ]
  );

  // 3) MARK ALL READ
  const handleAllNotificationsRead = useCallback(() => {
    try {
      browserNotificationService.closeAllNotifications();
      const now = new Date().toISOString();

      queryClient.setQueryData<NotificationsInfiniteData>(
        getNotificationsQueryKey(),
        (old) => {
          if (!old?.pages?.length) return old;
          const newPages = old.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((n) => ({
              ...n,
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
    } catch (err) {
      console.error("❌ Error handling all notifications read:", err);
    }
  }, [
    getNotificationsQueryKey,
    getUnreadNotificationsQueryKey,
    queryClient,
    workspaceId,
  ]);

  // Sync handlers into ref on every change (but NOT part of main effect deps)
  useEffect(() => {
    handlersRef.current = {
      handleNewNotification,
      handleNotificationRead,
      handleAllNotificationsRead,
    };
  }, [
    handleNewNotification,
    handleNotificationRead,
    handleAllNotificationsRead,
  ]);

  // Main realtime subscription effect
  useEffect(() => {
    if (!enabled || !workspaceMemberId || !workspaceId) return;

    // Clean up old duplicates
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    processedNotificationsRef.current.forEach((ts, id) => {
      if (now - ts > FIVE_MINUTES) {
        processedNotificationsRef.current.delete(id);
      }
    });

    const handler = notificationsRealtimeHandler;
    realtimeHandlerRef.current = handler;

    const channelFactory = (sbClient: typeof supabase) =>
      sbClient
        .channel(topic, { config: { broadcast: { self: false } } })
        .on("broadcast", { event: "new_notification" }, ({ payload }) =>
          handlersRef.current.handleNewNotification(payload)
        )
        .on("broadcast", { event: "notification_read" }, ({ payload }) =>
          handlersRef.current.handleNotificationRead(payload)
        )
        .on("broadcast", { event: "all_notifications_read" }, () =>
          handlersRef.current.handleAllNotificationsRead()
        );

    const removeChannel = handler.addChannel(channelFactory, {
      onSubscribe: (chan: RealtimeChannel) => {
        setConnectionStatus("SUBSCRIBED");
        setIsConnected(true);
      },
      onClose: (chan) => {
        setConnectionStatus("CLOSED");
        setIsConnected(false);
      },
      onTimeout: (chan) => {
        setConnectionStatus("TIMED_OUT");
        setIsConnected(false);
      },
      onError: (chan, err) => {
        setConnectionStatus("CHANNEL_ERROR");
        setIsConnected(false);
      },
    });

    const cleanup = handler.start();
    cleanupFnRef.current = () => {
      removeChannel();
      cleanup();
    };

    return () => {
      cleanupFnRef.current?.();
      realtimeHandlerRef.current = null;
    };
    // Only core data should be dependencies:
    // NOT the handlers!
  }, [enabled, workspaceMemberId, workspaceId, topic]);

  const forceReconnect = useCallback(() => {
    realtimeHandlerRef.current?.reconnectChannel(topic);
  }, [topic]);

  return {
    isConnected,
    connectionStatus,
    topic,
    forceReconnect,
  };
};
