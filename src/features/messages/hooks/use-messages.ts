import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "../api/messages-api";
import type {
  CreateChannelMessageData,
  CreateConversationMessageData,
  UpdateMessageData,
  MessageWithUser,
} from "../types";

/**
 * Hook for creating messages in channels
 */
export const useCreateChannelMessage = (
  workspaceId: string,
  channelId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelMessageData) =>
      messagesApi.createChannelMessage(workspaceId, channelId, data),
    onSuccess: (newMessage) => {
      // Invalidate and refetch channel messages
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId, channelId, "messages"],
      });

      // Update channels list (for last message preview)
      queryClient.invalidateQueries({
        queryKey: ["channels", workspaceId],
      });

      // If it's a thread reply, invalidate thread queries
      if (newMessage.parent_message_id || newMessage.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }
    },
    onError: (error) => {
      console.error("Failed to send channel message:", error);
    },
  });
};

/**
 * Hook for creating messages in conversations
 */
export const useCreateConversationMessage = (
  workspaceId: string,
  conversationId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationMessageData) =>
      messagesApi.createConversationMessage(workspaceId, conversationId, data),
    onSuccess: (newMessage) => {
      // Invalidate and refetch conversation messages
      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId, conversationId, "messages"],
      });

      // Update conversations list (for last message preview and unread counts)
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });

      // If it's a thread reply, invalidate thread queries
      if (newMessage.parent_message_id || newMessage.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }
    },
    onError: (error) => {
      console.error("Failed to send conversation message:", error);
    },
  });
};

/**
 * Hook for updating messages (works for both channels and conversations)
 */
export const useUpdateMessage = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      data,
    }: {
      messageId: string;
      data: UpdateMessageData;
    }) => messagesApi.updateMessage(workspaceId, messageId, data),
    onSuccess: (updatedMessage) => {
      // Invalidate relevant message lists
      if (updatedMessage.channel_id) {
        queryClient.invalidateQueries({
          queryKey: [
            "channel",
            workspaceId,
            updatedMessage.channel_id,
            "messages",
          ],
        });
      }

      if (updatedMessage.conversation_id) {
        queryClient.invalidateQueries({
          queryKey: [
            "conversation",
            workspaceId,
            updatedMessage.conversation_id,
            "messages",
          ],
        });
      }

      // Invalidate thread if it's a thread message
      if (updatedMessage.parent_message_id || updatedMessage.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }
    },
    onError: (error) => {
      console.error("Failed to update message:", error);
    },
  });
};

/**
 * Hook for deleting messages (works for both channels and conversations)
 */
export const useDeleteMessage = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      messagesApi.deleteMessage(workspaceId, messageId),
    onSuccess: (_, messageId) => {
      // Invalidate all message queries to refresh the lists
      // We don't know which channel/conversation this message belonged to
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
      });

      // Update lists for last message changes
      queryClient.invalidateQueries({
        queryKey: ["channels", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });
    },
    onError: (error) => {
      console.error("Failed to delete message:", error);
    },
  });
};

/**
 * Hook for adding reactions to messages
 */
export const useAddReaction = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.addReaction(workspaceId, messageId, emoji),
    onSuccess: () => {
      // Invalidate message queries to refresh reactions
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
      });
    },
    onError: (error) => {
      console.error("Failed to add reaction:", error);
    },
  });
};

/**
 * Hook for removing reactions from messages
 */
export const useRemoveReaction = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.removeReaction(workspaceId, messageId, emoji),
    onSuccess: () => {
      // Invalidate message queries to refresh reactions
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId],
      });

      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
      });
    },
    onError: (error) => {
      console.error("Failed to remove reaction:", error);
    },
  });
};

/**
 * Unified hook for message operations (convenience hook)
 */
export const useMessageOperations = (
  workspaceId: string,
  channelId?: string,
  conversationId?: string
) => {
  const createChannelMessage = useCreateChannelMessage(workspaceId, channelId!);
  const createConversationMessage = useCreateConversationMessage(
    workspaceId,
    conversationId!
  );
  const updateMessage = useUpdateMessage(workspaceId);
  const deleteMessage = useDeleteMessage(workspaceId);
  const addReaction = useAddReaction(workspaceId);
  const removeReaction = useRemoveReaction(workspaceId);

  return {
    // Create message based on context
    createMessage: channelId ? createChannelMessage : createConversationMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,

    // Individual hooks if needed
    createChannelMessage,
    createConversationMessage,
  };
};
