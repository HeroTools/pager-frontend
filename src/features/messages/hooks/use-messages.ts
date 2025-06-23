import { useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "../api/messages-api";
import type { MessageWithUser, CreateMessageData } from "../types";
import { toast } from "sonner";
import { UploadedAttachment } from "@/features/file-upload/types";
import { Message } from "@/types/chat";

interface User {
  id: string;
  name: string;
  image?: string;
}

interface OptimisticUpdateContext {
  previousChannelData?: any[];
  previousConversationData?: any[];
  previousThreadData?: any[];
}

interface UpdateMessageData {
  body?: string;
  attachment_ids?: string[];
  parent_message_id?: string | null;
  thread_id?: string | null;
  message_type?: string;
}

/**
 * Hook for adding reactions with optimistic updates
 */
export const useAddReaction = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.toggleReaction("add", workspaceId, messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      // Cancel outgoing refetches using the correct query key patterns
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });

      // Snapshot the previous values
      const previousChannelData = queryClient.getQueriesData({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      const previousConversationData = queryClient.getQueriesData({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      const previousThreadData = queryClient.getQueriesData({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
      const currentUser = queryClient.getQueryData(["current-user"]) as User;

      // Optimistically update all relevant queries
      const updateFunction = (oldData: any) => {
        // Handle different data structures (infinite queries vs regular queries)
        if (oldData?.pages) {
          // Infinite query structure
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages:
                page.messages?.map((message: Message) => {
                  if (message.id !== messageId) return message;
                  return updateMessageReactions(
                    message,
                    emoji,
                    currentUser,
                    "add"
                  );
                }) || [],
            })),
          };
        } else if (oldData?.messages) {
          // Regular query structure
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) => {
              if (message.id !== messageId) return message;
              return updateMessageReactions(message, emoji, currentUser, "add");
            }),
          };
        }
        return oldData;
      };

      // Apply optimistic updates to all matching queries
      queryClient.setQueriesData(
        { queryKey: ["channel", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["conversation", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["thread", workspaceId], exact: false },
        updateFunction
      );

      return {
        previousChannelData,
        previousConversationData,
        previousThreadData,
      } as OptimisticUpdateContext;
    },

    onError: (error, variables, context) => {
      console.error("Failed to add reaction:", error);

      // Rollback optimistic updates
      if (context) {
        context.previousChannelData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousConversationData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousThreadData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
    },
  });
};

/**
 * Hook for removing reactions with optimistic updates
 */
export const useRemoveReaction = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.toggleReaction("remove", workspaceId, messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      // Cancel outgoing refetches using the correct query key patterns
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });

      // Snapshot the previous values
      const previousChannelData = queryClient.getQueriesData({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      const previousConversationData = queryClient.getQueriesData({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      const previousThreadData = queryClient.getQueriesData({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
      const currentUser = queryClient.getQueryData(["current-user"]) as User;

      // Optimistically update all relevant queries
      const updateFunction = (oldData: any) => {
        // Handle different data structures (infinite queries vs regular queries)
        if (oldData?.pages) {
          // Infinite query structure
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages:
                page.messages?.map((message: Message) => {
                  if (message.id !== messageId) return message;
                  return updateMessageReactions(
                    message,
                    emoji,
                    currentUser,
                    "remove"
                  );
                }) || [],
            })),
          };
        } else if (oldData?.messages) {
          // Regular query structure
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) => {
              if (message.id !== messageId) return message;
              return updateMessageReactions(
                message,
                emoji,
                currentUser,
                "remove"
              );
            }),
          };
        }
        return oldData;
      };

      // Apply optimistic updates to all matching queries
      queryClient.setQueriesData(
        { queryKey: ["channel", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["conversation", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["thread", workspaceId], exact: false },
        updateFunction
      );

      return {
        previousChannelData,
        previousConversationData,
        previousThreadData,
      } as OptimisticUpdateContext;
    },

    onError: (error, variables, context) => {
      console.error("Failed to remove reaction:", error);

      // Rollback optimistic updates
      if (context) {
        context.previousChannelData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousConversationData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousThreadData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },

    onSettled: () => {
      // Refetch to ensure we have the latest data
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
    },
  });
};

/**
 * Helper function to update message reactions
 */
function updateMessageReactions(
  message: Message,
  emoji: string,
  currentUser: User,
  action: "add" | "remove"
): Message {
  if (action === "add") {
    const existingReaction = message?.reactions?.find((r) => r.value === emoji);

    if (existingReaction) {
      // Check if user already reacted
      const userAlreadyReacted = existingReaction.users.some(
        (u) => u.id === currentUser.id
      );
      if (userAlreadyReacted) return message; // Don't add duplicate

      // Add user to existing reaction
      return {
        ...message,
        reactions: message?.reactions?.map((r) =>
          r.value === emoji
            ? {
                ...r,
                count: r.count + 1,
                users: [...r.users, currentUser], // Fixed: was currentUser.id
              }
            : r
        ),
      };
    } else {
      // Create new reaction
      return {
        ...message,
        reactions: [
          ...(message?.reactions || []),
          {
            id: `temp_${message.id}_${emoji}_${Date.now()}`,
            value: emoji,
            count: 1,
            users: [currentUser.id], // Fixed: was [currentUser.id]
          },
        ],
      };
    }
  } else {
    // Remove reaction
    return {
      ...message,
      reactions: message.reactions
        ?.map((reaction) => {
          if (reaction.value !== emoji) return reaction;

          const updatedUsers = reaction.users.filter(
            (u) => u.id !== currentUser.id
          );

          return {
            ...reaction,
            count: updatedUsers.length,
            users: updatedUsers,
          };
        })
        .filter((reaction) => reaction.count > 0),
    };
  }
}

/**
 * Combined hook that intelligently adds or removes reactions
 */
export const useToggleReaction = (workspaceId: string) => {
  const addReaction = useReactionMutation(workspaceId, "add");
  const removeReaction = useReactionMutation(workspaceId, "remove");

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      currentlyReacted,
    }: {
      messageId: string;
      emoji: string;
      currentlyReacted: boolean;
    }) => {
      if (currentlyReacted) {
        return removeReaction.mutateAsync({ messageId, emoji });
      } else {
        return addReaction.mutateAsync({ messageId, emoji });
      }
    },
  });
};

/**
 * Consolidated hook for reaction mutations with optimistic updates
 */
const useReactionMutation = (workspaceId: string, action: "add" | "remove") => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      messagesApi.toggleReaction(action, workspaceId, messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });

      // Snapshot previous values
      const previousChannelData = queryClient.getQueriesData({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      const previousConversationData = queryClient.getQueriesData({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      const previousThreadData = queryClient.getQueriesData({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
      const currentUser = queryClient.getQueryData(["current-user"]) as User;

      // Optimistic update function
      const updateFunction = (oldData: any) => {
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages:
                page.messages?.map((message: Message) => {
                  if (message.id !== messageId) return message;
                  return updateMessageReactions(
                    message,
                    emoji,
                    currentUser,
                    action
                  );
                }) || [],
            })),
          };
        } else if (oldData?.messages) {
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) => {
              if (message.id !== messageId) return message;
              return updateMessageReactions(
                message,
                emoji,
                currentUser,
                action
              );
            }),
          };
        }
        return oldData;
      };

      // Apply optimistic updates
      queryClient.setQueriesData(
        { queryKey: ["channel", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["conversation", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["thread", workspaceId], exact: false },
        updateFunction
      );

      return {
        previousChannelData,
        previousConversationData,
        previousThreadData,
      } as OptimisticUpdateContext;
    },

    onError: (error, variables, context) => {
      console.error(`Failed to ${action} reaction:`, error);

      // Rollback optimistic updates
      if (context) {
        context.previousChannelData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousConversationData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.previousThreadData?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      // Show user feedback
      toast.error(`Failed to ${action} reaction. Please try again.`);
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
    },
  });
};

/**
 * Helper hook to check if current user has reacted to a message with specific emoji
 */
export const useHasUserReacted = (
  message: Message,
  emoji: string,
  currentUserId: string
): boolean => {
  const reaction = message?.reactions?.find((r) => r.value === emoji);
  return reaction?.users.some((u) => u.id === currentUserId) ?? false;
};

/**
 * Updated hook for creating channel messages with correct cache keys
 */
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
    mutationFn: (data: CreateMessageData) =>
      messagesApi.createChannelMessage(workspaceId, channelId, {
        body: data.body,
        attachment_ids: data.attachments?.map((attachment) => attachment.id),
        parent_message_id: data.parent_message_id,
        thread_id: data.thread_id,
        message_type: data.message_type,
      }),

    // Optimistic update - add message immediately to infinite query
    onMutate: async (data) => {
      // Cancel outgoing refetches for the infinite query
      await queryClient.cancelQueries({
        queryKey: getInfiniteQueryKey(),
      });

      // Snapshot previous value
      const previousMessages = queryClient.getQueryData(getInfiniteQueryKey());
      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      console.log(currentUser, "currentUser");

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
        attachment_id: null,
        workspace_member_id: currentUser?.workspace_member_id || "",
        user: {
          id: currentUser?.id || "",
          name: currentUser?.name || "You",
          email: currentUser?.email || "",
          image: currentUser?.image || null,
        },
        attachments:
          data.attachments?.map((attachment: UploadedAttachment) => ({
            id: attachment.id,
            public_url: attachment.publicUrl,
            content_type: attachment.contentType,
            size_bytes: attachment.sizeBytes,
            s3_bucket: "",
            s3_key: "",
            uploaded_by: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) || [],
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

        console.log("NEW pages in create", tempMessage);

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
      toast.error("Failed to send message. Please try again.");
    },

    onSettled: () => {
      // Optional: Refetch to ensure consistency
      // queryClient.invalidateQueries({
      //   queryKey: getInfiniteQueryKey(),
      // });
    },
  });
};

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
    mutationFn: (data: CreateMessageData) =>
      messagesApi.createConversationMessage(workspaceId, conversationId, {
        body: data.body,
        attachment_ids: data.attachments?.map((attachment) => attachment.id),
        parent_message_id: data.parent_message_id,
        thread_id: data.thread_id,
        message_type: data.message_type,
      }),

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
        workspace_member_id: currentUser?.workspace_member_id || "",
        user: {
          id: currentUser?.id || "",
          name: currentUser?.name || "You",
          email: currentUser?.email || "",
          image: currentUser?.image || null,
        },
        attachments:
          data.attachments?.map((attachment: UploadedAttachment) => ({
            id: attachment.id,
            public_url: attachment.publicUrl,
            content_type: attachment.contentType,
            size_bytes: attachment.sizeBytes,
            s3_bucket: "",
            s3_key: "",
            uploaded_by: "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) || [],
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
 * Hook for updating messages with optimistic updates
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

    onMutate: async ({ messageId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });

      // Snapshot previous data
      const previousData = {
        channels: queryClient.getQueriesData({
          queryKey: ["channel", workspaceId],
          exact: false,
        }),
        conversations: queryClient.getQueriesData({
          queryKey: ["conversation", workspaceId],
          exact: false,
        }),
        threads: queryClient.getQueriesData({
          queryKey: ["thread", workspaceId],
          exact: false,
        }),
      };

      // Optimistic update function
      const updateFunction = (oldData: any) => {
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages:
                page.messages?.map((message: Message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        body: data.body ?? message.body,
                        edited_at: new Date().toISOString(),
                      }
                    : message
                ) || [],
            })),
          };
        } else if (oldData?.messages) {
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) =>
              message.id === messageId
                ? {
                    ...message,
                    body: data.body ?? message.body,
                    edited_at: new Date().toISOString(),
                  }
                : message
            ),
          };
        }
        return oldData;
      };

      // Apply optimistic updates
      queryClient.setQueriesData(
        { queryKey: ["channel", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["conversation", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["thread", workspaceId], exact: false },
        updateFunction
      );

      return previousData;
    },

    onError: (error, variables, context) => {
      console.error("Failed to update message:", error);

      // Rollback optimistic updates
      if (context) {
        context.channels?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.conversations?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.threads?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error("Failed to update message. Please try again.");
    },

    onSuccess: (updatedMessage) => {
      console.log("Message updated successfully:", updatedMessage);
      toast.success("Message updated successfully");
    },
  });
};

/**
 * Hook for deleting messages with optimistic updates
 */
export const useDeleteMessage = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      messagesApi.deleteMessage(workspaceId, messageId),

    onMutate: async (messageId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["conversation", workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });

      // Snapshot previous data
      const previousData = {
        channels: queryClient.getQueriesData({
          queryKey: ["channel", workspaceId],
          exact: false,
        }),
        conversations: queryClient.getQueriesData({
          queryKey: ["conversation", workspaceId],
          exact: false,
        }),
        threads: queryClient.getQueriesData({
          queryKey: ["thread", workspaceId],
          exact: false,
        }),
      };

      // Optimistic update function - mark as deleted
      const updateFunction = (oldData: any) => {
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages:
                page.messages?.map((message: Message) =>
                  message.id === messageId
                    ? { ...message, deleted_at: new Date().toISOString() }
                    : message
                ) || [],
            })),
          };
        } else if (oldData?.messages) {
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) =>
              message.id === messageId
                ? { ...message, deleted_at: new Date().toISOString() }
                : message
            ),
          };
        }
        return oldData;
      };

      // Apply optimistic updates
      queryClient.setQueriesData(
        { queryKey: ["channel", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["conversation", workspaceId], exact: false },
        updateFunction
      );
      queryClient.setQueriesData(
        { queryKey: ["thread", workspaceId], exact: false },
        updateFunction
      );

      return previousData;
    },

    onError: (error, messageId, context) => {
      console.error("Failed to delete message:", error);

      // Rollback optimistic updates
      if (context) {
        context.channels?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.conversations?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
        context.threads?.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error("Failed to delete message. Please try again.");
    },

    onSuccess: () => {
      console.log("Message deleted successfully");
      toast.success("Message deleted successfully");

      // Invalidate to refresh lists and update last message info
      queryClient.invalidateQueries({
        queryKey: ["channels", workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: ["conversations", workspaceId],
      });
    },
  });
};

export const useTypingIndicator = (
  workspaceId: string,
  channelId?: string,
  conversationId?: string
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  const mutation = useMutation({
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

  const startTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      mutation.mutate(true);
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set timeout to stop typing indicator after 3 seconds of inactivity
    timeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        mutation.mutate(false);
      }
    }, 3000);
  }, [mutation]);

  const stopTyping = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isTypingRef.current) {
      isTypingRef.current = false;
      mutation.mutate(false);
    }
  }, [mutation]);

  return {
    startTyping,
    stopTyping,
    isLoading: mutation.isPending,
  };
};

export const useMessageReplies = (
  workspaceId: string,
  messageId: string,
  params?: {
    limit?: number;
    cursor?: string;
    before?: string;
    entity_type?: "channel" | "conversation";
    entity_id?: string;
  }
) => {
  const {
    data,
    isLoading: isLoadingThread,
    error: threadError,
  } = useQuery({
    queryKey: ["thread", workspaceId, messageId],
    queryFn: () =>
      messagesApi.getMessageReplies({
        workspaceId,
        messageId,
        params: {
          limit: params?.limit || 50,
          include_reactions: "true",
          include_attachments: "true",
          entity_type: params?.entity_type,
          entity_id: params?.entity_id,
        },
      }),
    enabled:
      !!workspaceId &&
      !!messageId &&
      !!params?.context_type &&
      !!params?.context_id,
  });

  return { data, isLoadingThread, threadError };
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
  const toggleReaction = useToggleReaction(workspaceId);

  return {
    // Create message based on context
    createMessage: channelId ? createChannelMessage : createConversationMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    toggleReaction,

    // Individual hooks if needed
    createChannelMessage,
    createConversationMessage,
  };
};
