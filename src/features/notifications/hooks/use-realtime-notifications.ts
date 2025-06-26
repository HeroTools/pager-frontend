import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { subscriptionManager } from "@/lib/realtime/subscription-manager";
import { useNotificationStore } from "@/features/notifications/store/notifications";

interface UseRealtimeNotificationsProps {
  userId: string;
  workspaceId: string;
  enabled?: boolean;
}

interface NotificationData {
  id: string;
  type: "mention" | "direct_message" | "channel_message" | "thread_reply";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  workspace_id: string;
  related_message_id?: string;
  related_channel_id?: string;
  related_conversation_id?: string;
}

/**
 * Hook to manage real-time notification events via SubscriptionManager.
 * Follows the same pattern as useRealtimeChannel but for user notifications.
 */
export const useRealtimeNotifications = ({
  userId,
  workspaceId,
  enabled = true,
}: UseRealtimeNotificationsProps) => {
  const queryClient = useQueryClient();
  const { addNotification, markAsRead } = useNotificationStore();

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "CONNECTING" | "SUBSCRIBED" | "CHANNEL_ERROR" | "CLOSED" | "TIMED_OUT"
  >("CONNECTING");

  // Generate stable keys for React Query
  const getNotificationsQueryKey = () => ["notifications", workspaceId, userId];

  const topic = `user:${userId}`;

  useEffect(() => {
    if (!enabled || !userId || !workspaceId) return;

    setConnectionStatus("CONNECTING");

    // Handler: New notifications
    const handleNewNotification = (payload: any) => {
      const notification = payload.notification as NotificationData;

      console.log("New notification received:", notification);

      // Add to notification store
      addNotification(notification);

      // Update React Query cache for notifications list
      queryClient.setQueryData(getNotificationsQueryKey(), (old: any) => {
        if (!old) {
          return {
            notifications: [notification],
            unreadCount: notification.is_read ? 0 : 1,
          };
        }

        // Check if notification already exists
        const exists = old.notifications?.some(
          (n: NotificationData) => n.id === notification.id
        );
        if (exists) return old;

        return {
          notifications: [notification, ...(old.notifications || [])],
          unreadCount: notification.is_read
            ? old.unreadCount
            : (old.unreadCount || 0) + 1,
        };
      });

      // Optional: Show toast/system notification
      if (document.hidden || !document.hasFocus()) {
        toast.info(notification.title, { description: notification.message });
      }
    };

    // Handler: Notification read status update
    const handleNotificationRead = (payload: any) => {
      const { notificationId, isRead } = payload;

      // Update store
      if (isRead) {
        markAsRead(notificationId);
      }

      // Update React Query cache
      queryClient.setQueryData(getNotificationsQueryKey(), (old: any) => {
        if (!old?.notifications) return old;

        const updatedNotifications = old.notifications.map(
          (n: NotificationData) =>
            n.id === notificationId ? { ...n, is_read: isRead } : n
        );

        const unreadCount = updatedNotifications.filter(
          (n: NotificationData) => !n.is_read
        ).length;

        return {
          notifications: updatedNotifications,
          unreadCount,
        };
      });
    };

    // Subscribe to broadcast events using your existing pattern
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

    // Listen to connection status updates
    const handleStatusChange = (status: string) => {
      setConnectionStatus(status as any);
      setIsConnected(status === "SUBSCRIBED");
    };

    subscriptionManager.onStatusChange(topic, handleStatusChange);

    // Cleanup on unmount or dependency change
    return () => {
      subscriptionManager.unsubscribe(topic);
      subscriptionManager.offStatusChange(topic, handleStatusChange);
    };
  }, [
    topic,
    userId,
    workspaceId,
    enabled,
    queryClient,
    addNotification,
    markAsRead,
  ]);

  return { isConnected, connectionStatus };
};
