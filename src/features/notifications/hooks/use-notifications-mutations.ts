import { useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/constants/query-keys';
import type {
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  NotificationsResponse,
  NotificationEntity,
} from '@/features/notifications/types';
import type { InfiniteData } from '@tanstack/react-query';

type NotificationsInfiniteData = InfiniteData<NotificationsResponse, string | null>;

interface UnreadCountData {
  unread_count: number;
}

interface MarkNotificationMutationParams {
  notificationIds: string[];
  workspaceId: string;
}

interface NotificationMutationContext {
  prevList?: NotificationsInfiniteData;
  prevUnread?: NotificationsInfiniteData;
  prevCount?: UnreadCountData;
}

interface NotificationQueryKeys {
  list: readonly unknown[];
  unread: readonly unknown[];
  unreadCount: readonly unknown[];
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkNotificationReadResponse,
    Error,
    MarkNotificationMutationParams,
    NotificationMutationContext
  >({
    mutationFn: ({ notificationIds, workspaceId }: MarkNotificationMutationParams) =>
      notificationsApi.markNotificationAsRead(workspaceId, notificationIds),

    onMutate: async ({ notificationIds, workspaceId }): Promise<NotificationMutationContext> => {
      const queryKeys: NotificationQueryKeys = {
        list: notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        unread: notificationKeys.unread(workspaceId),
        unreadCount: notificationKeys.unreadCount(workspaceId),
      };

      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.list }),
        queryClient.cancelQueries({ queryKey: queryKeys.unread }),
        queryClient.cancelQueries({ queryKey: queryKeys.unreadCount }),
      ]);

      const now = new Date().toISOString();

      const updatePages = (
        data?: NotificationsInfiniteData,
      ): NotificationsInfiniteData | undefined => {
        if (!data) return data;

        return {
          ...data,
          pages: data.pages.map((page) => {
            const unreadNotificationsBeingMarked = page.notifications.filter(
              (notification) => notificationIds.includes(notification.id) && !notification.is_read,
            );
            const countRead = unreadNotificationsBeingMarked.length;

            return {
              ...page,
              notifications: page.notifications.map((notification) =>
                notificationIds.includes(notification.id)
                  ? { ...notification, is_read: true, read_at: now }
                  : notification,
              ),
              unread_count: Math.max(0, page.unread_count - countRead),
            };
          }),
        };
      };

      const removeFromUnreadPages = (
        data?: NotificationsInfiniteData,
      ): NotificationsInfiniteData | undefined => {
        if (!data) return data;

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.filter(
              (notification) => !notificationIds.includes(notification.id),
            ),
            unread_count: Math.max(0, page.unread_count - notificationIds.length),
          })),
        };
      };

      const prevList = queryClient.getQueryData<NotificationsInfiniteData>(queryKeys.list);
      const prevUnread = queryClient.getQueryData<NotificationsInfiniteData>(queryKeys.unread);
      const prevCount = queryClient.getQueryData<UnreadCountData>(queryKeys.unreadCount);

      queryClient.setQueryData(queryKeys.list, updatePages);
      queryClient.setQueryData(queryKeys.unread, removeFromUnreadPages);

      if (prevCount) {
        const unreadToMarkCount = notificationIds.length;
        queryClient.setQueryData<UnreadCountData>(queryKeys.unreadCount, {
          unread_count: Math.max(0, prevCount.unread_count - unreadToMarkCount),
        });
      }

      return { prevList, prevUnread, prevCount };
    },

    onError: (
      err: Error,
      { workspaceId }: MarkNotificationMutationParams,
      context?: NotificationMutationContext,
    ) => {
      const queryKeys: NotificationQueryKeys = {
        list: notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        unread: notificationKeys.unread(workspaceId),
        unreadCount: notificationKeys.unreadCount(workspaceId),
      };

      if (context?.prevList) {
        queryClient.setQueryData(queryKeys.list, context.prevList);
      }
      if (context?.prevUnread) {
        queryClient.setQueryData(queryKeys.unread, context.prevUnread);
      }
      if (context?.prevCount) {
        queryClient.setQueryData(queryKeys.unreadCount, context.prevCount);
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error marking notifications read:', errorMessage);
    },

    onSettled: (_data, _error, { workspaceId }: MarkNotificationMutationParams) => {
      const queryKeys: NotificationQueryKeys = {
        list: notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        unread: notificationKeys.unread(workspaceId),
        unreadCount: notificationKeys.unreadCount(workspaceId),
      };

      queryClient.invalidateQueries({ queryKey: queryKeys.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.unread });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation<MarkAllNotificationsReadResponse, Error, string, NotificationMutationContext>({
    mutationFn: (workspaceId: string) => notificationsApi.markAllNotificationsAsRead(workspaceId),

    onMutate: async (workspaceId: string): Promise<NotificationMutationContext> => {
      const queryKeys: NotificationQueryKeys = {
        list: notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        unread: notificationKeys.unread(workspaceId),
        unreadCount: notificationKeys.unreadCount(workspaceId),
      };

      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.list }),
        queryClient.cancelQueries({ queryKey: queryKeys.unread }),
        queryClient.cancelQueries({ queryKey: queryKeys.unreadCount }),
      ]);

      const now = new Date().toISOString();

      const markAllRead = (
        data?: NotificationsInfiniteData,
      ): NotificationsInfiniteData | undefined => {
        if (!data) return data;

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: page.notifications.map((notification: NotificationEntity) => ({
              ...notification,
              is_read: true,
              read_at: now,
            })),
            unread_count: 0,
          })),
        };
      };

      const clearUnreadPages = (
        data?: NotificationsInfiniteData,
      ): NotificationsInfiniteData | undefined => {
        if (!data) return data;

        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            notifications: [],
            unread_count: 0,
          })),
        };
      };

      const prevList = queryClient.getQueryData<NotificationsInfiniteData>(queryKeys.list);
      const prevUnread = queryClient.getQueryData<NotificationsInfiniteData>(queryKeys.unread);
      const prevCount = queryClient.getQueryData<UnreadCountData>(queryKeys.unreadCount);

      queryClient.setQueryData(queryKeys.list, markAllRead);
      queryClient.setQueryData(queryKeys.unread, clearUnreadPages);
      queryClient.setQueryData<UnreadCountData>(queryKeys.unreadCount, {
        unread_count: 0,
      });

      return { prevList, prevUnread, prevCount };
    },

    onError: (err: Error, workspaceId: string, context?: NotificationMutationContext) => {
      const queryKeys: NotificationQueryKeys = {
        list: notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        unread: notificationKeys.unread(workspaceId),
        unreadCount: notificationKeys.unreadCount(workspaceId),
      };

      if (context?.prevList) {
        queryClient.setQueryData(queryKeys.list, context.prevList);
      }
      if (context?.prevUnread) {
        queryClient.setQueryData(queryKeys.unread, context.prevUnread);
      }
      if (context?.prevCount) {
        queryClient.setQueryData(queryKeys.unreadCount, context.prevCount);
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error marking all notifications read:', errorMessage);
    },

    onSettled: (_data, _error, workspaceId: string) => {
      const queryKeys: NotificationQueryKeys = {
        list: notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        unread: notificationKeys.unread(workspaceId),
        unreadCount: notificationKeys.unreadCount(workspaceId),
      };

      queryClient.invalidateQueries({ queryKey: queryKeys.list });
      queryClient.invalidateQueries({ queryKey: queryKeys.unread });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
}
