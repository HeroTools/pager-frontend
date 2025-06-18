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

  // Use the same query key as your infinite query
  const getInfiniteQueryKey = () => [
    "channel",
    workspaceId,
    channelId,
    "messages",
    "infinite",
  ];

  return useMutation({
    mutationFn: (data: CreateChannelMessageData) =>
      messagesApi.createChannelMessage(workspaceId, channelId, data),

    // Optimistic update - add message immediately to infinite query
    onMutate: async (data) => {
      // Cancel outgoing refetches for the infinite query
      await queryClient.cancelQueries({
        queryKey: getInfiniteQueryKey(),
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(getInfiniteQueryKey());
      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      // Optimistically update with temporary message
      const tempMessage: MessageWithUser = {
        id: `temp-${Date.now()}`, // Temporary ID
        body: data.body,
        channel_id: channelId,
        workspace_id: workspaceId,
        message_type: data.message_type || "channel",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        parent_message_id: data.parent_message_id || null,
        thread_id: data.thread_id || null,
        attachment_id: data.attachment_id || null,
        workspace_member_id: currentUser?.workspace_member_id || "",
        user: {
          id: currentUser?.id || "",
          name: currentUser?.name || "You",
          email: currentUser?.email || "",
          image: currentUser?.image || null,
        },
        attachment: data.attachment_id
          ? {
              id: data.attachment_id,
              url: "", // Will be filled by server
              content_type: null,
              size_bytes: null,
            }
          : undefined,
        reactions: [],
        _isOptimistic: true,
      };

      // Update the infinite query data
      queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) {
          // Create initial structure if no data exists
          return {
            pages: [
              {
                messages: [tempMessage],
                members: [],
                pagination: {
                  hasMore: false,
                  nextCursor: null,
                  totalCount: 1,
                },
              },
            ],
            pageParams: [undefined],
          };
        }

        // Add to the first page (most recent messages)
        const newPages = [...old.pages];
        const firstPage = newPages[0];

        if (firstPage) {
          newPages[0] = {
            ...firstPage,
            messages: [tempMessage, ...firstPage.messages],
            pagination: {
              ...firstPage.pagination,
              totalCount: (firstPage.pagination?.totalCount || 0) + 1,
            },
          };
        }

        return {
          ...old,
          pages: newPages,
        };
      });

      return { previousMessages, tempMessage };
    },

    onSuccess: (newMessage, variables, context) => {
      // Replace optimistic message with real one from server
      queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
        if (!old || !context?.tempMessage) return old;
        console.log("OLD pages in create", old.pages);
        console.log("TEMP message in create", context.tempMessage);
        console.log("NEW message in create", newMessage);
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: MessageWithUser) =>
            msg.id === context.tempMessage.id ? newMessage : msg
          ),
        }));

        console.log("NEW pages in create", newPages);

        return {
          ...old,
          pages: newPages,
        };
      });

      // Update other related caches
      queryClient.invalidateQueries({
        queryKey: ["channels", workspaceId],
      });

      // If it's a thread message, invalidate thread queries
      if (newMessage?.parent_message_id || newMessage?.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }

      console.log("Message sent successfully and added to cache");
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          getInfiniteQueryKey(),
          context.previousMessages
        );
      }

      console.error("Failed to send channel message:", error);

      // Optionally show error toast/notification here
      // toast.error("Failed to send message. Please try again.");
    },

    onSettled: () => {
      // Optional: Refetch to ensure consistency
      // queryClient.invalidateQueries({
      //   queryKey: getInfiniteQueryKey(),
      // });
    },
  });
};

/**
 * Enhanced hook for creating messages in conversations with optimistic updates
 */
/**
 * Enhanced hook for creating messages in conversations with optimistic updates
 */
export const useCreateConversationMessage = (
  workspaceId: string,
  conversationId: string
) => {
  const queryClient = useQueryClient();

  // Use the same query key pattern as your infinite query
  const getInfiniteQueryKey = () => [
    "conversation",
    workspaceId,
    conversationId,
    "messages",
    "infinite",
  ];

  return useMutation({
    mutationFn: (data: CreateConversationMessageData) =>
      messagesApi.createConversationMessage(workspaceId, conversationId, data),

    // Optimistic update - add message immediately to infinite query
    onMutate: async (data) => {
      // Cancel outgoing refetches for the infinite query
      await queryClient.cancelQueries({
        queryKey: getInfiniteQueryKey(),
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(getInfiniteQueryKey());
      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      // Optimistically update with temporary message
      const tempMessage: MessageWithUser = {
        id: `temp-${Date.now()}`, // Temporary ID
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
        workspace_member_id: currentUser?.workspace_member_id || "",
        user: {
          id: currentUser?.id || "",
          name: currentUser?.name || "You",
          email: currentUser?.email || "",
          image: currentUser?.image || null,
        },
        attachment: data.attachment_id
          ? {
              id: data.attachment_id,
              url: "", // Will be filled by server
              content_type: null,
              size_bytes: null,
            }
          : undefined,
        reactions: [],
        _isOptimistic: true,
      };

      // Update the infinite query data
      queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) {
          // Create initial structure if no data exists
          return {
            pages: [
              {
                messages: [tempMessage],
                members: [],
                pagination: {
                  hasMore: false,
                  nextCursor: null,
                  totalCount: 1,
                },
              },
            ],
            pageParams: [undefined],
          };
        }

        // Add to the first page (most recent messages)
        const newPages = [...old.pages];
        const firstPage = newPages[0];

        if (firstPage) {
          newPages[0] = {
            ...firstPage,
            messages: [tempMessage, ...firstPage.messages],
            pagination: {
              ...firstPage.pagination,
              totalCount: (firstPage.pagination?.totalCount || 0) + 1,
            },
          };
        }

        return {
          ...old,
          pages: newPages,
        };
      });

      return { previousMessages, tempMessage };
    },

    onSuccess: (newMessage, variables, context) => {
      // Replace optimistic message with real one from server
      queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
        if (!old || !context?.tempMessage) return old;

        console.log("OLD pages in create", old.pages);
        console.log("TEMP message in create", context.tempMessage);
        console.log("NEW message in create", newMessage);

        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((msg: MessageWithUser) =>
            msg.id === context.tempMessage.id ? newMessage : msg
          ),
        }));

        console.log("NEW pages in create", newPages);

        return {
          ...old,
          pages: newPages,
        };
      });

      // Update other related caches
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });

      // If it's a thread message, invalidate thread queries
      if (newMessage?.parent_message_id || newMessage?.thread_id) {
        queryClient.invalidateQueries({
          queryKey: ["thread", workspaceId],
        });
      }

      console.log("Message sent successfully and added to cache");
    },

    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousMessages) {
        queryClient.setQueryData(
          getInfiniteQueryKey(),
          context.previousMessages
        );
      }

      console.error("Failed to send conversation message:", error);

      // Optionally show error toast/notification here
      // toast.error("Failed to send message. Please try again.");
    },

    onSettled: () => {
      // Optional: Refetch to ensure consistency
      // queryClient.invalidateQueries({
      //   queryKey: getInfiniteQueryKey(),
      // });
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
