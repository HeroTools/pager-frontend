import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";
import type {
  ConversationEntity,
  CreateConversationData,
  ConversationFilters,
} from "../types";

export const useConversations = (
  workspaceId: string,
  filters?: Partial<ConversationFilters>
) => {
  const queryClient = useQueryClient();

  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations", workspaceId, filters],
    queryFn: () => conversationsApi.getConversations(workspaceId, filters),
    enabled: !!workspaceId,
  });

  const createConversation = useMutation({
    mutationFn: (data: CreateConversationData) =>
      conversationsApi.createConversation(workspaceId, data),
    onSuccess: (newConversation) => {
      // Optimistically update the conversations list
      queryClient.setQueryData<ConversationEntity[]>(
        ["conversations", workspaceId],
        (old) => (old ? [...old, newConversation] : [newConversation])
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.deleteConversation(workspaceId, conversationId),
    onSuccess: (_, conversationId) => {
      // Remove from conversations list cache
      queryClient.setQueryData<ConversationEntity[]>(
        ["conversations", workspaceId],
        (old) =>
          old?.filter((conversation) => conversation.id !== conversationId) ||
          []
      );

      // Remove all related caches
      queryClient.removeQueries({
        queryKey: ["conversation", workspaceId, conversationId],
      });

      queryClient.removeQueries({
        queryKey: ["conversation-messages", workspaceId, conversationId],
      });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    deleteConversation,
  };
};
