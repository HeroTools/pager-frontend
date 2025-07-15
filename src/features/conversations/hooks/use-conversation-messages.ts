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
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
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
