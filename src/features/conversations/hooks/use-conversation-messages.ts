import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "../api/conversations-api";
import type {
  ConversationEntity,
  ConversationMessage,
  ConversationMessageWithRelations,
  CreateConversationMessageData,
  UpdateConversationMessageData,
  ConversationMessageFilters,
} from "../types";

export const useConversationMessages = (
  workspaceId: string,
  conversationId: string,
  filters?: Partial<ConversationMessageFilters>
) => {
  const queryClient = useQueryClient();

  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversation-messages", workspaceId, conversationId, filters],
    queryFn: () =>
      conversationsApi.getConversationMessages(
        workspaceId,
        conversationId,
        filters
      ),
    enabled: !!(workspaceId && conversationId),
  });

  const createMessage = useMutation({
    mutationFn: (data: CreateConversationMessageData) =>
      conversationsApi.createMessage(workspaceId, conversationId, data),
    onSuccess: (newMessage) => {
      // Optimistically update the messages list
      queryClient.setQueryData<ConversationMessage[]>(
        ["conversation-messages", workspaceId, conversationId],
        (old) => (old ? [...old, newMessage] : [newMessage])
      );

      // Update the conversation's updated_at timestamp
      queryClient.setQueryData<ConversationEntity>(
        ["conversation", workspaceId, conversationId],
        (old) =>
          old
            ? {
                ...old,
                updated_at: newMessage.created_at,
              }
            : old
      );

      // Invalidate conversations list to update last message info
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
    onSuccess: (updatedMessage) => {
      // Update the message in the messages list
      queryClient.setQueryData<ConversationMessage[]>(
        ["conversation-messages", workspaceId, conversationId],
        (old) =>
          old?.map((message) =>
            message.id === updatedMessage.id ? updatedMessage : message
          ) || []
      );
    },
  });

  const deleteMessage = useMutation({
    mutationFn: (messageId: string) =>
      conversationsApi.deleteMessage(workspaceId, conversationId, messageId),
    onSuccess: (_, messageId) => {
      // For soft delete, we might want to refetch instead of removing
      // since the message still exists but is marked as deleted
      queryClient.invalidateQueries({
        queryKey: ["conversation-messages", workspaceId, conversationId],
      });
    },
  });

  const markAsRead = useMutation({
    mutationFn: (messageId: string) =>
      conversationsApi.markAsRead(workspaceId, conversationId, messageId),
    onSuccess: () => {
      // Invalidate conversations list to update unread status
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });

      // Invalidate conversation with members to update read status
      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId, conversationId, "members"],
      });
    },
  });

  return {
    messages,
    isLoading,
    error,
    createMessage,
    updateMessage,
    deleteMessage,
    markAsRead,
  };
};
