import { useInfiniteQuery } from '@tanstack/react-query';
import { conversationsApi } from '../api/conversations-api';

export const useGetConversationWithMessagesInfinite = (
  workspaceId: string,
  conversationId: string,
  limit: number = 50,
) => {
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['conversation', workspaceId, conversationId, 'messages', 'infinite'],
    queryFn: ({ pageParam }) =>
      conversationsApi.getConversationWithMessages(workspaceId, conversationId, {
        limit,
        cursor: pageParam,
      }),
    enabled: !!workspaceId && !!conversationId,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage?.pagination;

      if (!pagination) {
        return undefined;
      }

      return pagination.hasMore ? pagination.nextCursor : undefined;
    },
    staleTime: 1000 * 30, // 30 seconds - allow refetch if data is older than this
    gcTime: 1000 * 60 * 10, // 10 minutes - keep in memory for this long
    refetchOnWindowFocus: false,
    refetchOnMount: 'always', // Always refetch when component mounts to catch missed messages
    refetchOnReconnect: true, // Refetch when network reconnects
    initialPageParam: undefined as string | undefined,
    select: (data) => ({
      pages: data.pages,
      pageParams: data.pageParams,
    }),
  });

  return {
    data: infiniteQuery.data,
    isLoading: infiniteQuery.isLoading,
    error: infiniteQuery.error,
    refetch: infiniteQuery.refetch,
    fetchNextPage: infiniteQuery.fetchNextPage,
    hasNextPage: infiniteQuery.hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
  };
};
