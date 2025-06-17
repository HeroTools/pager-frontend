import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";
import {
  CreateConversationMessageData,
  UpdateConversationMessageData,
} from "../types";

export const useConversationWithMessages = (
  workspaceId: string,
  conversationId: string,
  params?: { limit?: number; cursor?: string; before?: string }
) => {
  const queryClient = useQueryClient();

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

  const createMessage = useMutation({
    mutationFn: (data: CreateConversationMessageData) =>
      conversationsApi.createMessage(workspaceId, conversationId, data),
    onSuccess: () => {
      query.refetch();
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });
    },
  });

  const updateMessage = useMutation({
    mutationFn: ({
      messageId,
      data,
    }: {
      messageId: string;
      data: UpdateConversationMessageData;
    }) =>
      conversationsApi.updateMessage(
        workspaceId,
        conversationId,
        messageId,
        data
      ),
    onSuccess: () => query.refetch(),
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) =>
      conversationsApi.deleteMessage(workspaceId, conversationId, messageId),
    onSuccess: () => query.refetch(),
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
    createMessage,
    updateMessage,
    deleteMessage,
  };
};
