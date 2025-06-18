import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";

export const useConversationWithMessages = (
  workspaceId: string,
  conversationId: string,
  params?: { limit?: number; cursor?: string; before?: string }
) => {
  const query = useQuery({
    queryKey: ["conversation", workspaceId, conversationId, "messages", params],
    queryFn: () =>
      conversationsApi.getConversationWithMessages(
        workspaceId,
        conversationId,
        params
      ),
    enabled: !!(workspaceId && conversationId),
    staleTime: 30000,
  });

  return {
    data: query.data,
    messages: query.data?.data.messages || [],
    members: query.data?.data.members || [],
    conversation: query.data?.data.conversation,
    pagination: query.data?.data.pagination,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};

export const useGetConversationWithMessagesInfinite = (
  workspaceId: string,
  conversationId: string,
  limit: number = 50
) => {
  const infiniteQuery = useInfiniteQuery({
    queryKey: [
      "conversation",
      workspaceId,
      conversationId,
      "messages",
      "infinite",
    ],
    queryFn: ({ pageParam }) =>
      conversationsApi.getConversationWithMessages(
        workspaceId,
        conversationId,
        {
          limit,
          cursor: pageParam,
        }
      ),
    enabled: !!(workspaceId && conversationId),
    getNextPageParam: (lastPage) => {
      console.log("getNextPageParam - lastPage structure:", lastPage);

      const pagination = lastPage?.pagination;

      if (!pagination) {
        console.log("No pagination found in response");
        return undefined;
      }

      console.log("Pagination:", {
        hasMore: pagination.hasMore,
        nextCursor: pagination.nextCursor,
      });

      return pagination.hasMore ? pagination.nextCursor : undefined;
    },
    staleTime: 30000,
    gcTime: 300000,
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
