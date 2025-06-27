import { useQueryClient, useMutation } from "@tanstack/react-query";
import { notificationsApi } from "@/features/notifications/api/notifications-api";
import { notificationKeys } from "@/features/notifications/constants/query-keys";
import type {
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  NotificationsResponse,
  NotificationEntity,
} from "@/features/notifications/types";
import type { InfiniteData } from "@tanstack/react-query";

type NotificationsInfiniteData = InfiniteData<
  NotificationsResponse,
  string | null
>;

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkNotificationReadResponse,
    Error,
    { notificationId: string; workspaceId: string }
  >({
    mutationFn: ({ notificationId, workspaceId }) => {
      return notificationsApi.markNotificationAsRead(
        workspaceId,
        notificationId
      );
    },
    onMutate: async ({ notificationId, workspaceId }) => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.workspace(workspaceId),
      });

      const updateNotificationInPages = (
        data: NotificationsInfiniteData | undefined
      ): NotificationsInfiniteData | undefined => {
        if (!data?.pages?.length) return data;

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((notification) =>
              notification.id === notificationId
                ? {
                    ...notification,
                    is_read: true,
                    read_at: new Date().toISOString(),
                  }
                : notification
            ),
          })),
        };
      };

      const previousNotificationsList =
        queryClient.getQueryData<NotificationsInfiniteData>(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false })
        );

      const previousUnreadList =
        queryClient.getQueryData<NotificationsInfiniteData>(
          notificationKeys.unread(workspaceId)
        );

      const previousUnreadCount = queryClient.getQueryData<{
        unread_count: number;
      }>(notificationKeys.unreadCount(workspaceId));

      queryClient.setQueryData<NotificationsInfiniteData>(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        updateNotificationInPages
      );

      if (previousUnreadList) {
        queryClient.setQueryData<NotificationsInfiniteData>(
          notificationKeys.unread(workspaceId),
          (data) => {
            if (!data?.pages?.length) return data;
            return {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                notifications: page.notifications.filter(
                  (notification) => notification.id !== notificationId
                ),
                unread_count: Math.max(0, page.unread_count - 1),
              })),
            };
          }
        );
      }

      if (previousUnreadCount && previousUnreadCount.unread_count > 0) {
        queryClient.setQueryData<{ unread_count: number }>(
          notificationKeys.unreadCount(workspaceId),
          { unread_count: previousUnreadCount.unread_count - 1 }
        );
      }

      return {
        previousNotificationsList,
        previousUnreadList,
        previousUnreadCount,
      };
    },
    onError: (error, { workspaceId }, context) => {
      if (context?.previousNotificationsList) {
        queryClient.setQueryData(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
          context.previousNotificationsList
        );
      }
      if (context?.previousUnreadList) {
        queryClient.setQueryData(
          notificationKeys.unread(workspaceId),
          context.previousUnreadList
        );
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(workspaceId),
          context.previousUnreadCount
        );
      }
      console.error("Failed to mark notification as read:", error);
    },
    onSettled: (data, error, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.workspace(workspaceId),
      });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation<MarkAllNotificationsReadResponse, Error, string>({
    mutationFn: (workspaceId: string) => {
      return notificationsApi.markAllNotificationsAsRead(workspaceId);
    },
    onMutate: async (workspaceId) => {
      await queryClient.cancelQueries({
        queryKey: notificationKeys.workspace(workspaceId),
      });

      const now = new Date().toISOString();

      const markAllAsRead = (
        data: NotificationsInfiniteData | undefined
      ): NotificationsInfiniteData | undefined => {
        if (!data?.pages?.length) return data;

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((notification) => ({
              ...notification,
              is_read: true,
              read_at: now,
            })),
            unread_count: 0,
          })),
        };
      };

      const previousNotificationsList =
        queryClient.getQueryData<NotificationsInfiniteData>(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false })
        );

      const previousUnreadList =
        queryClient.getQueryData<NotificationsInfiniteData>(
          notificationKeys.unread(workspaceId)
        );

      const previousUnreadCount = queryClient.getQueryData<{
        unread_count: number;
      }>(notificationKeys.unreadCount(workspaceId));

      queryClient.setQueryData<NotificationsInfiniteData>(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        markAllAsRead
      );

      queryClient.setQueryData<NotificationsInfiniteData>(
        notificationKeys.unread(workspaceId),
        (data) => {
          if (!data?.pages?.length) return data;
          return {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              notifications: [],
              unread_count: 0,
            })),
          };
        }
      );

      queryClient.setQueryData<{ unread_count: number }>(
        notificationKeys.unreadCount(workspaceId),
        { unread_count: 0 }
      );

      return {
        previousNotificationsList,
        previousUnreadList,
        previousUnreadCount,
      };
    },
    onError: (error, workspaceId, context) => {
      if (context?.previousNotificationsList) {
        queryClient.setQueryData(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
          context.previousNotificationsList
        );
      }
      if (context?.previousUnreadList) {
        queryClient.setQueryData(
          notificationKeys.unread(workspaceId),
          context.previousUnreadList
        );
      }
      if (context?.previousUnreadCount) {
        queryClient.setQueryData(
          notificationKeys.unreadCount(workspaceId),
          context.previousUnreadCount
        );
      }
      console.error("Failed to mark all notifications as read:", error);
    },
    onSettled: (data, error, workspaceId) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.workspace(workspaceId),
      });
    },
  });
}
