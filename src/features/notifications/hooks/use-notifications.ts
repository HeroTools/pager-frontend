import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/constants/query-keys';
import type { NotificationsResponse } from '@/features/notifications/types';

export function useInitialNotifications(workspaceId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: notificationKeys.initial(workspaceId),
    queryFn: () => notificationsApi.getInitialNotifications(workspaceId),
    enabled: enabled && !!workspaceId,
    staleTime: 1000 * 60 * 60 * 24,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications({
  workspaceId,
  limit = 50,
  unreadOnly = false,
  enabled = true,
}: {
  workspaceId: string;
  limit?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(workspaceId, { limit, unreadOnly }),
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      return notificationsApi.getNotifications(workspaceId, {
        limit,
        unreadOnly,
        cursor: pageParam,
      });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;
      return pagination?.hasMore ? pagination.nextCursor : undefined;
    },
    enabled: enabled && !!workspaceId,
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotifications(
  workspaceId: string,
  limit: number = 50,
  enabled: boolean = true,
) {
  return useInfiniteQuery({
    queryKey: notificationKeys.unread(workspaceId),
    queryFn: ({ pageParam }: { pageParam?: string }) => {
      return notificationsApi.getUnreadNotifications(workspaceId, limit, pageParam);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;
      return pagination?.hasMore ? pagination.nextCursor : undefined;
    },
    enabled: enabled && !!workspaceId,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCount(workspaceId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(workspaceId),
    queryFn: () => notificationsApi.getUnreadCount(workspaceId),
    enabled: enabled && !!workspaceId,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationCache() {
  const queryClient = useQueryClient();

  return {
    getInitialNotifications: (workspaceId: string) => {
      return queryClient.getQueryData<NotificationsResponse>(notificationKeys.initial(workspaceId));
    },
    getUnreadCount: (workspaceId: string) => {
      return queryClient.getQueryData<{ unread_count: number }>(
        notificationKeys.unreadCount(workspaceId),
      );
    },
    invalidateAll: (workspaceId?: string) => {
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.workspace(workspaceId),
        });
      } else {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.all,
        });
      }
    },
    refetchAll: (workspaceId: string) => {
      return queryClient.refetchQueries({
        queryKey: notificationKeys.workspace(workspaceId),
      });
    },
  };
}
