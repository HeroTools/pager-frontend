import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "../api/messages-api";
import type {
  CreateChannelMessageData,
  CreateConversationMessageData,
  UpdateMessageData,
  MessageWithUser,
} from "../types";

export const useCreateChannelMessage = (
  workspaceId: string,
  channelId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateChannelMessageData) =>
      messagesApi.createChannelMessage(workspaceId, channelId, data),

    // Optimistic update - add message immediately
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId, channelId, "messages"],
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData([
        "channel",
        workspaceId,
        channelId,
        "messages",
      ]);

      // Optimistically update with temporary message
      const tempMessage: MessageWithUser = {
        id: `temp-${Date.now()}`, // Temporary ID
        body: data.body,
        channel_id: channelId,
        workspace_id: workspaceId,
        message_type: data.message_type || "direct",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        parent_message_id: data.parent_message_id || null,
        thread_id: data.thread_id || null,
        attachment_id: data.attachment_id || null,
        workspace_member_id: "", // Will be filled by server
        user: {
          // Get current user from cache or context
          id: "", // You'll need to pass this
          name: "You",
          email: "",
          image: null,
        },
        attachment: null,
        reactions: [],
        // Mark as optimistic
        _isOptimistic: true,
      };

      queryClient.setQueryData(
        ["channel", workspaceId, channelId, "messages"],
        (old: any) => {
          if (!old) return { pages: [[tempMessage]], pageParams: [undefined] };

          // Add to first page
          const newPages = [...old.pages];
          newPages[0] = [tempMessage, ...newPages[0]];

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      return { previousMessages, tempMessage };
    },

    onSuccess: (newMessage, variables, context) => {
      // Replace optimistic message with real one
      queryClient.setQueryData(
        ["channel", workspaceId, channelId, "messages"],
        (old: any) => {
          if (!old) return old;

          const newPages = old.pages.map((page: MessageWithUser[]) =>
            page.map((msg: MessageWithUser) =>
              msg.id === context?.tempMessage.id ? newMessage : msg
            )
          );

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      // Update other caches
      queryClient.invalidateQueries({
        queryKey: ["channels", workspaceId],
      });

      if (newMessage?.parent_message_id || newMessage?.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["channel", workspaceId, channelId, "messages"],
          context.previousMessages
        );
      }
      console.error("Failed to send channel message:", error);
    },
  });
};

/**
 * Enhanced hook for creating messages in conversations with optimistic updates
 */
export const useCreateConversationMessage = (
  workspaceId: string,
  conversationId: string
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationMessageData) =>
      messagesApi.createConversationMessage(workspaceId, conversationId, data),

    onMutate: async (data) => {
      await queryClient.cancelQueries({
        queryKey: ["conversation", workspaceId, conversationId, "messages"],
      });

      const previousMessages = queryClient.getQueryData([
        "conversation",
        workspaceId,
        conversationId,
        "messages",
      ]);

      const tempMessage: MessageWithUser = {
        id: `temp-${Date.now()}`,
        body: data.body,
        conversation_id: conversationId,
        workspace_id: workspaceId,
        message_type: data.message_type || "direct",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        parent_message_id: data.parent_message_id || null,
        thread_id: data.thread_id || null,
        attachment_id: data.attachment_id || null,
        workspace_member_id: "",
        user: {
          id: "",
          name: "You",
          email: "",
          image: null,
        },
        attachment: null,
        reactions: [],
        _isOptimistic: true,
      };

      queryClient.setQueryData(
        ["conversation", workspaceId, conversationId, "messages"],
        (old: any) => {
          if (!old) return { pages: [[tempMessage]], pageParams: [undefined] };

          const newPages = [...old.pages];
          newPages[0] = [tempMessage, ...newPages[0]];

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      return { previousMessages, tempMessage };
    },

    onSuccess: (newMessage, variables, context) => {
      queryClient.setQueryData(
        ["conversation", workspaceId, conversationId, "messages"],
        (old: any) => {
          if (!old) return old;

          const newPages = old.pages.map((page: MessageWithUser[]) =>
            page.map((msg: MessageWithUser) =>
              msg.id === context?.tempMessage.id ? newMessage : msg
            )
          );

          return {
            ...old,
            pages: newPages,
          };
        }
      );

      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });

      if (newMessage?.parent_message_id || newMessage?.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }
    },

    onError: (error, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["conversation", workspaceId, conversationId, "messages"],
          context.previousMessages
        );
      }
      console.error("Failed to send conversation message:", error);
    },
  });
};

/**
 * Hook for typing indicators
 */
export const useTypingIndicator = (
  workspaceId: string,
  channelId?: string,
  conversationId?: string
) => {
  return useMutation({
    mutationFn: async (isTyping: boolean) => {
      const endpoint = channelId
        ? `/workspaces/${workspaceId}/channels/${channelId}/typing`
        : `/workspaces/${workspaceId}/conversations/${conversationId}/typing`;

      return messagesApi.sendTypingIndicator(endpoint, { is_typing: isTyping });
    },
    onError: (error) => {
      console.error("Failed to send typing indicator:", error);
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
      if (updatedMessage?.parent_message_id || updatedMessage?.thread_id) {
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
