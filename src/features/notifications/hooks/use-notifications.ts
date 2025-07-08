import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/features/notifications/api/notifications-api';
import { notificationKeys } from '@/features/notifications/constants/query-keys';

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

export function useUnreadCount(workspaceId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(workspaceId),
    queryFn: () => notificationsApi.getUnreadCount(workspaceId),
    enabled: enabled && !!workspaceId,
    staleTime: 1000 * 60 * 30,
    refetchOnWindowFocus: true,
  });
}
