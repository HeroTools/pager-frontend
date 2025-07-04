import { useQueryClient, useMutation } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/constants/query-keys';
import type {
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
  NotificationsResponse,
} from '@/features/notifications/types';
import type { InfiniteData } from '@tanstack/react-query';

type NotificationsInfiniteData = InfiniteData<NotificationsResponse, string | null>;

/**
 * Hook to mark one or multiple notifications as read.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation<
    MarkNotificationReadResponse,
    Error,
    { notificationIds: string[]; workspaceId: string }
  >({
    mutationFn: ({ notificationIds, workspaceId }) =>
      notificationsApi.markNotificationAsRead(workspaceId, notificationIds),

    onMutate: async ({ notificationIds, workspaceId }) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: notificationKeys.list(workspaceId, {
            limit: 50,
            unreadOnly: false,
          }),
        }),
        queryClient.cancelQueries({
          queryKey: notificationKeys.unread(workspaceId),
        }),
        queryClient.cancelQueries({
          queryKey: notificationKeys.unreadCount(workspaceId),
        }),
      ]);

      const now = new Date().toISOString();

      const updatePages = (data?: NotificationsInfiniteData) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => {
                const countRead = page.notifications.filter((n) =>
                  notificationIds.includes(n.id),
                ).length;
                return {
                  ...page,
                  notifications: page.notifications.map((n) =>
                    notificationIds.includes(n.id) ? { ...n, is_read: true, read_at: now } : n,
                  ),
                  unread_count: Math.max(0, (page as any).unread_count - countRead),
                };
              }),
            }
          : data;

      const prevList = queryClient.getQueryData<NotificationsInfiniteData>(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
      );
      const prevUnread = queryClient.getQueryData<NotificationsInfiniteData>(
        notificationKeys.unread(workspaceId),
      );
      const prevCount = queryClient.getQueryData<{ unread_count: number }>(
        notificationKeys.unreadCount(workspaceId),
      );

      queryClient.setQueryData(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        updatePages,
      );
      queryClient.setQueryData(notificationKeys.unread(workspaceId), updatePages);
      if (prevCount) {
        queryClient.setQueryData(notificationKeys.unreadCount(workspaceId), {
          unread_count: Math.max(0, prevCount.unread_count - notificationIds.length),
        });
      }

      return { prevList, prevUnread, prevCount };
    },

    onError: (err, { workspaceId }, ctx) => {
      if (ctx?.prevList)
        queryClient.setQueryData(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
          ctx.prevList,
        );
      if (ctx?.prevUnread)
        queryClient.setQueryData(notificationKeys.unread(workspaceId), ctx.prevUnread);
      if (ctx?.prevCount)
        queryClient.setQueryData(notificationKeys.unreadCount(workspaceId), ctx.prevCount);
      console.error('Error marking notifications read:', err);
    },

    onSettled: (_data, _error, { workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.list(workspaceId, {
          limit: 50,
          unreadOnly: false,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(workspaceId),
      });
    },
  });
}

/**
 * Hook to mark all notifications as read.
 */
export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();

  return useMutation<MarkAllNotificationsReadResponse, Error, string>({
    mutationFn: (workspaceId) => notificationsApi.markAllNotificationsAsRead(workspaceId),

    onMutate: async (workspaceId) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: notificationKeys.list(workspaceId, {
            limit: 50,
            unreadOnly: false,
          }),
        }),
        queryClient.cancelQueries({
          queryKey: notificationKeys.unread(workspaceId),
        }),
        queryClient.cancelQueries({
          queryKey: notificationKeys.unreadCount(workspaceId),
        }),
      ]);

      const now = new Date().toISOString();

      const markAll = (data?: NotificationsInfiniteData) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                notifications: page.notifications.map((n) => ({
                  ...n,
                  is_read: true,
                  read_at: now,
                })),
                unread_count: 0,
              })),
            }
          : data;

      const prevList = queryClient.getQueryData<NotificationsInfiniteData>(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
      );
      const prevUnread = queryClient.getQueryData<NotificationsInfiniteData>(
        notificationKeys.unread(workspaceId),
      );
      const prevCount = queryClient.getQueryData<{ unread_count: number }>(
        notificationKeys.unreadCount(workspaceId),
      );

      queryClient.setQueryData(
        notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
        markAll,
      );
      queryClient.setQueryData(notificationKeys.unread(workspaceId), markAll);
      queryClient.setQueryData(notificationKeys.unreadCount(workspaceId), {
        unread_count: 0,
      });

      return { prevList, prevUnread, prevCount };
    },

    onError: (err, workspaceId, ctx) => {
      if (ctx?.prevList)
        queryClient.setQueryData(
          notificationKeys.list(workspaceId, { limit: 50, unreadOnly: false }),
          ctx.prevList,
        );
      if (ctx?.prevUnread)
        queryClient.setQueryData(notificationKeys.unread(workspaceId), ctx.prevUnread);
      if (ctx?.prevCount)
        queryClient.setQueryData(notificationKeys.unreadCount(workspaceId), ctx.prevCount);
      console.error('Error marking all notifications read:', err);
    },

    onSettled: (_data, _error, workspaceId) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.list(workspaceId, {
          limit: 50,
          unreadOnly: false,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unread(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.unreadCount(workspaceId),
      });
    },
  });
}
