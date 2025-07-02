import { useRef, useCallback } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { messagesApi } from "../api/messages-api";
import type { MessageWithUser, CreateMessageData } from "../types";
import { UploadedAttachment } from "@/features/file-upload/types";
import { Message } from "@/types/chat";

interface UpdateMessageData {
  body?: string;
  attachment_ids?: string[];
  parent_message_id?: string | null;
  thread_id?: string | null;
  message_type?: string;
}

/**
 * Updated hook for creating channel messages with correct cache keys
 */
export const useCreateChannelMessage = (
  workspaceId: string,
  channelId: string
) => {
  const queryClient = useQueryClient();

  const getInfiniteQueryKey = useCallback(
    () => ["channel", workspaceId, channelId, "messages", "infinite"],
    [workspaceId, channelId]
  );

  const getThreadQueryKey = useCallback(
    (threadParentId: string) => ["thread", workspaceId, threadParentId],
    [workspaceId]
  );

  return useMutation({
    mutationKey: ["createChannelMessage", workspaceId, channelId],

    mutationFn: async (data: CreateMessageData) => {
      console.log("Creating message:", data);

      const result = await messagesApi.createChannelMessage(
        workspaceId,
        channelId,
        {
          body: data.body,
          attachment_ids: data.attachments?.map((att) => att.id),
          parent_message_id: data.parent_message_id,
          thread_id: data.thread_id,
          message_type: data.message_type,
          plain_text: data.plain_text,
        }
      );

      console.log("Message created successfully:", result);
      return result;
    },

    onMutate: async (data) => {
      console.log("onMutate called with:", data);

      const threadParentId = data.parent_message_id || data.thread_id;
      const isThreadMessage = Boolean(threadParentId);
      const queryKey = getInfiniteQueryKey();
      const threadQueryKey = isThreadMessage
        ? getThreadQueryKey(threadParentId)
        : null;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      if (isThreadMessage && threadQueryKey) {
        await queryClient.cancelQueries({ queryKey: threadQueryKey });
      }

      // Snapshot the previous values
      const previousChannelMessages = queryClient.getQueryData(queryKey);
      const previousThreadMessages =
        isThreadMessage && threadQueryKey
          ? queryClient.getQueryData(threadQueryKey)
          : null;

      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      if (!currentUser) {
        console.error("No current user found for optimistic update");
        return {
          previousChannelMessages,
          previousThreadMessages,
          isThreadMessage,
          threadParentId,
        };
      }

      const optimisticMessage: MessageWithUser = {
        id: data._optimisticId || `temp-${Date.now()}-${Math.random()}`,
        body: data.body,
        channel_id: channelId,
        conversation_id: null,
        workspace_id: workspaceId,
        message_type: data.message_type || "channel",
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
        thread_reply_count: 0,
        thread_last_reply_at: null,
        thread_participants: [],
        _isOptimistic: true,
      };

      // Optimistically update the cache
      if (isThreadMessage && threadQueryKey) {
        // Check if this is the first thread message by looking at parent's thread_reply_count
        let isFirstThreadMessage = false;
        const channelData: any = queryClient.getQueryData(queryKey);
        if (channelData?.pages) {
          for (const page of channelData.pages) {
            const parentMessage = page.messages.find(
              (msg: any) => msg.id === threadParentId
            );
            if (parentMessage) {
              isFirstThreadMessage =
                (parentMessage.thread_reply_count || 0) === 0;
              console.log(
                "🧵 Parent message thread_reply_count:",
                parentMessage.thread_reply_count,
                "isFirst:",
                isFirstThreadMessage
              );
              break;
            }
          }
        }

        // Check if thread cache exists
        const existingThreadData = queryClient.getQueryData(threadQueryKey);

        // Update thread cache if it's the first message OR cache already exists
        if (isFirstThreadMessage || existingThreadData) {
          queryClient.setQueryData(threadQueryKey, (old: any) => {
            if (!old) {
              return {
                replies: [optimisticMessage],
                members: [],
                pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
              };
            }

            return {
              ...old,
              replies: [...(old.replies || []), optimisticMessage],
              pagination: {
                ...old.pagination,
                totalCount: (old.pagination?.totalCount || 0) + 1,
              },
            };
          });
        }

        // Update parent message's thread metadata in channel
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.length) return old;

          const updatedPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: MessageWithUser) => {
              if (msg.id === threadParentId) {
                // Update thread metadata
                const currentParticipants = msg.thread_participants || [];
                const messageUser = optimisticMessage.user;

                // Add current user to participants if not already there
                const updatedParticipants =
                  messageUser &&
                  !currentParticipants.some(
                    (id: string) => id === messageUser.id
                  )
                    ? [...currentParticipants, messageUser.id]
                    : currentParticipants;

                return {
                  ...msg,
                  thread_reply_count: (msg.thread_reply_count || 0) + 1,
                  thread_last_reply_at: optimisticMessage.created_at,
                  thread_participants: updatedParticipants,
                };
              }
              return msg;
            }),
          }));
          return { ...old, pages: updatedPages };
        });
      } else {
        // Update channel messages
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.length) {
            return {
              pages: [
                {
                  messages: [optimisticMessage],
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

          const newPages = [...old.pages];
          const firstPage = newPages[0];

          // Check if message already exists (prevent duplicates)
          const messageExists = firstPage.messages.some(
            (msg: any) => msg.id === optimisticMessage.id
          );

          if (messageExists) {
            return old;
          }

          // Add to the end of the first page (newest messages)
          newPages[0] = {
            ...firstPage,
            messages: [...firstPage.messages, optimisticMessage],
            pagination: {
              ...firstPage.pagination,
              totalCount: (firstPage.pagination?.totalCount || 0) + 1,
            },
          };

          return { ...old, pages: newPages };
        });
      }

      // Return context for rollback
      return {
        previousChannelMessages,
        previousThreadMessages,
        isThreadMessage,
        threadParentId,
        optimisticId: optimisticMessage.id,
      };
    },

    onSuccess: (realMessage, variables, context) => {
      const queryKey = getInfiniteQueryKey();
      const isThreadMessage = context?.isThreadMessage;
      const threadParentId = context?.threadParentId;

      if (context?.optimisticId && realMessage) {
        // Replace the optimistic message with the real one in channel messages
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.length) return old;

          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.id === context.optimisticId
                ? { ...realMessage, _isOptimistic: false }
                : msg
            ),
          }));

          return { ...old, pages: newPages };
        });

        // If it's a thread message, also update the thread cache
        if (isThreadMessage && threadParentId) {
          const threadQueryKey = getThreadQueryKey(threadParentId);
          queryClient.setQueryData(threadQueryKey, (old: any) => {
            if (!old?.replies) return old;

            return {
              ...old,
              replies: old.replies.map((reply: any) =>
                reply.id === context.optimisticId
                  ? { ...realMessage, _isOptimistic: false }
                  : reply
              ),
            };
          });

          // Update parent message with real thread metadata from server
          if (realMessage.parent_message_id) {
            queryClient.setQueryData(queryKey, (old: any) => {
              if (!old?.pages?.length) return old;

              const updatedPages = old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: any) => {
                  if (msg.id === realMessage.parent_message_id) {
                    // Use server data for thread metadata if available
                    return {
                      ...msg,
                      thread_reply_count:
                        realMessage.thread_reply_count ||
                        msg.thread_reply_count,
                      thread_last_reply_at: realMessage.created_at,
                      // Keep participants as is for now, server should handle this
                    };
                  }
                  return msg;
                }),
              }));
              return { ...old, pages: updatedPages };
            });
          }
        }
      }
    },

    // If the mutation fails, rollback
    onError: (error, variables, context) => {
      console.error("Failed to send channel message:", error);

      const queryKey = getInfiniteQueryKey();

      // Rollback channel messages
      if (context?.previousChannelMessages) {
        queryClient.setQueryData(queryKey, context.previousChannelMessages);
      }

      // Rollback thread messages if applicable
      if (
        context?.isThreadMessage &&
        context?.threadParentId &&
        context?.previousThreadMessages
      ) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.setQueryData(
          threadQueryKey,
          context.previousThreadMessages
        );
      }

      toast.error("Failed to send message. Please try again.");
    },

    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables, context) => {
      const queryKey = getInfiniteQueryKey();

      // Invalidate channel messages
      queryClient.invalidateQueries({
        queryKey,
        exact: true,
        refetchType: "none", // Don't refetch immediately to avoid disrupting UX
      });

      // Invalidate thread messages if applicable
      if (context?.isThreadMessage && context?.threadParentId) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.invalidateQueries({
          queryKey: threadQueryKey,
          exact: true,
          refetchType: "none",
        });
      }

      // Mark queries as stale for eventual refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        if (context?.isThreadMessage && context?.threadParentId) {
          const threadQueryKey = getThreadQueryKey(context.threadParentId);
          queryClient.invalidateQueries({ queryKey: threadQueryKey });
        }
      }, 1000);
    },
  });
};

export const useCreateConversationMessage = (
  workspaceId: string,
  conversationId: string
) => {
  const queryClient = useQueryClient();

  const getInfiniteQueryKey = useCallback(
    () => ["conversation", workspaceId, conversationId, "messages", "infinite"],
    [workspaceId, conversationId]
  );

  const getThreadQueryKey = useCallback(
    (threadParentId: string) => ["thread", workspaceId, threadParentId],
    [workspaceId]
  );

  return useMutation({
    mutationKey: ["createConversationMessage", workspaceId, conversationId],

    mutationFn: async (data: CreateMessageData) => {
      console.log("Creating conversation message:", data);

      const result = await messagesApi.createConversationMessage(
        workspaceId,
        conversationId,
        {
          body: data.body,
          attachment_ids: data.attachments?.map((att) => att.id),
          parent_message_id: data.parent_message_id,
          thread_id: data.thread_id,
          message_type: data.message_type,
          plain_text: data.plain_text,
        }
      );

      console.log("Conversation message created successfully:", result);
      return result;
    },

    onMutate: async (data) => {
      console.log("onMutate called with:", data);

      const threadParentId = data.parent_message_id || data.thread_id;
      const isThreadMessage = Boolean(threadParentId);
      const queryKey = getInfiniteQueryKey();
      const threadQueryKey = isThreadMessage
        ? getThreadQueryKey(threadParentId)
        : null;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      if (isThreadMessage && threadQueryKey) {
        await queryClient.cancelQueries({ queryKey: threadQueryKey });
      }

      // Snapshot the previous values
      const previousConversationMessages = queryClient.getQueryData(queryKey);
      const previousThreadMessages =
        isThreadMessage && threadQueryKey
          ? queryClient.getQueryData(threadQueryKey)
          : null;

      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      if (!currentUser) {
        console.error("No current user found for optimistic update");
        return {
          previousConversationMessages,
          previousThreadMessages,
          isThreadMessage,
          threadParentId,
        };
      }

      const optimisticMessage: MessageWithUser = {
        id: data._optimisticId || `temp-${Date.now()}-${Math.random()}`,
        body: data.body,
        channel_id: null,
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
        thread_reply_count: 0,
        thread_last_reply_at: null,
        thread_participants: [],
        _isOptimistic: true,
      };

      // Optimistically update the cache
      if (isThreadMessage && threadQueryKey) {
        // Check if this is the first thread message by looking at parent's thread_reply_count
        let isFirstThreadMessage = false;
        const conversationData: any = queryClient.getQueryData(queryKey);
        if (conversationData?.pages) {
          for (const page of conversationData.pages) {
            const parentMessage = page.messages.find(
              (msg: any) => msg.id === threadParentId
            );
            if (parentMessage) {
              isFirstThreadMessage =
                (parentMessage.thread_reply_count || 0) === 0;
              console.log(
                "🧵 Parent message thread_reply_count:",
                parentMessage.thread_reply_count,
                "isFirst:",
                isFirstThreadMessage
              );
              break;
            }
          }
        }

        // Check if thread cache exists
        const existingThreadData = queryClient.getQueryData(threadQueryKey);

        // Update thread cache if it's the first message OR cache already exists
        if (isFirstThreadMessage || existingThreadData) {
          queryClient.setQueryData(threadQueryKey, (old: any) => {
            if (!old) {
              return {
                replies: [optimisticMessage],
                members: [],
                pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
              };
            }

            return {
              ...old,
              replies: [...(old.replies || []), optimisticMessage],
              pagination: {
                ...old.pagination,
                totalCount: (old.pagination?.totalCount || 0) + 1,
              },
            };
          });
        }

        // Update parent message's thread metadata in conversation
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.length) return old;

          const updatedPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: MessageWithUser) => {
              if (msg.id === threadParentId) {
                // Update thread metadata
                const currentParticipants = msg.thread_participants || [];
                const messageUser = optimisticMessage.user;

                // Add current user to participants if not already there
                const updatedParticipants =
                  messageUser &&
                  !currentParticipants.some(
                    (id: string) => id === messageUser.id
                  )
                    ? [...currentParticipants, messageUser.id]
                    : currentParticipants;

                return {
                  ...msg,
                  thread_reply_count: (msg.thread_reply_count || 0) + 1,
                  thread_last_reply_at: optimisticMessage.created_at,
                  thread_participants: updatedParticipants,
                };
              }
              return msg;
            }),
          }));
          return { ...old, pages: updatedPages };
        });
      } else {
        // Update conversation messages
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.length) {
            return {
              pages: [
                {
                  messages: [optimisticMessage],
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

          const newPages = [...old.pages];
          const firstPage = newPages[0];

          // Check if message already exists (prevent duplicates)
          const messageExists = firstPage.messages.some(
            (msg: any) => msg.id === optimisticMessage.id
          );

          if (messageExists) {
            return old;
          }

          // Add to the end of the first page (newest messages)
          newPages[0] = {
            ...firstPage,
            messages: [...firstPage.messages, optimisticMessage],
            pagination: {
              ...firstPage.pagination,
              totalCount: (firstPage.pagination?.totalCount || 0) + 1,
            },
          };

          return { ...old, pages: newPages };
        });
      }

      // Return context for rollback
      return {
        previousConversationMessages,
        previousThreadMessages,
        isThreadMessage,
        threadParentId,
        optimisticId: optimisticMessage.id,
      };
    },

    onSuccess: (realMessage, variables, context) => {
      const queryKey = getInfiniteQueryKey();
      const isThreadMessage = context?.isThreadMessage;
      const threadParentId = context?.threadParentId;

      if (context?.optimisticId && realMessage) {
        // Replace the optimistic message with the real one in conversation messages
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.pages?.length) return old;

          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.id === context.optimisticId
                ? { ...realMessage, _isOptimistic: false }
                : msg
            ),
          }));

          return { ...old, pages: newPages };
        });

        // If it's a thread message, also update the thread cache
        if (isThreadMessage && threadParentId) {
          const threadQueryKey = getThreadQueryKey(threadParentId);
          queryClient.setQueryData(threadQueryKey, (old: any) => {
            if (!old?.replies) return old;

            return {
              ...old,
              replies: old.replies.map((reply: any) =>
                reply.id === context.optimisticId
                  ? { ...realMessage, _isOptimistic: false }
                  : reply
              ),
            };
          });

          // Update parent message with real thread metadata from server
          if (realMessage.parent_message_id) {
            queryClient.setQueryData(queryKey, (old: any) => {
              if (!old?.pages?.length) return old;

              const updatedPages = old.pages.map((page: any) => ({
                ...page,
                messages: page.messages.map((msg: any) => {
                  if (msg.id === realMessage.parent_message_id) {
                    // Use server data for thread metadata if available
                    return {
                      ...msg,
                      thread_reply_count:
                        realMessage.thread_reply_count ||
                        msg.thread_reply_count,
                      thread_last_reply_at: realMessage.created_at,
                      // Keep participants as is for now, server should handle this
                    };
                  }
                  return msg;
                }),
              }));
              return { ...old, pages: updatedPages };
            });
          }
        }
      }
    },

    // If the mutation fails, rollback
    onError: (error, variables, context) => {
      console.error("Failed to send conversation message:", error);

      const queryKey = getInfiniteQueryKey();

      // Rollback conversation messages
      if (context?.previousConversationMessages) {
        queryClient.setQueryData(
          queryKey,
          context.previousConversationMessages
        );
      }

      // Rollback thread messages if applicable
      if (
        context?.isThreadMessage &&
        context?.threadParentId &&
        context?.previousThreadMessages
      ) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.setQueryData(
          threadQueryKey,
          context.previousThreadMessages
        );
      }

      toast.error("Failed to send message. Please try again.");
    },

    // Always refetch after error or success to ensure consistency
    onSettled: (data, error, variables, context) => {
      const queryKey = getInfiniteQueryKey();

      // Invalidate conversation messages
      queryClient.invalidateQueries({
        queryKey,
        exact: true,
        refetchType: "none", // Don't refetch immediately to avoid disrupting UX
      });

      // Invalidate thread messages if applicable
      if (context?.isThreadMessage && context?.threadParentId) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.invalidateQueries({
          queryKey: threadQueryKey,
          exact: true,
          refetchType: "none",
        });
      }

      // Mark queries as stale for eventual refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey });
        if (context?.isThreadMessage && context?.threadParentId) {
          const threadQueryKey = getThreadQueryKey(context.threadParentId);
          queryClient.invalidateQueries({ queryKey: threadQueryKey });
        }
      }, 1000);
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
                page.messages?.map((message: Message) => {
                  if (message.id === messageId) {
                    // Mark the message as deleted
                    return { ...message, deleted_at: new Date().toISOString() };
                  }
                  
                  // If this message has a thread and we're deleting one of its replies,
                  // decrement the thread count optimistically
                  const deletedMessage = page.messages?.find((m: Message) => m.id === messageId);
                  if (deletedMessage?.threadId === message.id || deletedMessage?.parent_message_id === message.id) {
                    const currentCount = message.threadCount || 0;
                    return {
                      ...message,
                      threadCount: Math.max(0, currentCount - 1),
                    };
                  }
                  
                  return message;
                }) || [],
            })),
          };
        } else if (oldData?.messages) {
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) => {
              if (message.id === messageId) {
                // Mark the message as deleted
                return { ...message, deleted_at: new Date().toISOString() };
              }
              
              // If this message has a thread and we're deleting one of its replies,
              // decrement the thread count optimistically
              const deletedMessage = oldData.messages?.find((m: Message) => m.id === messageId);
              if (deletedMessage?.threadId === message.id || deletedMessage?.parent_message_id === message.id) {
                const currentCount = message.threadCount || 0;
                return {
                  ...message,
                  threadCount: Math.max(0, currentCount - 1),
                };
              }
              
              return message;
            }),
          };
        } else if (oldData?.replies) {
          // Handle thread-specific data structure
          return {
            ...oldData,
            replies: oldData.replies.map((message: Message) =>
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
      
      // Invalidate all thread-related queries to update thread counts and replies
      queryClient.invalidateQueries({
        queryKey: ["thread", workspaceId],
        exact: false,
      });
      
      // Invalidate infinite message queries for both channels and conversations
      queryClient.invalidateQueries({
        queryKey: ["channel", workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ["conversation", workspaceId], 
        exact: false,
      });
      
      // Invalidate any specific message queries
      queryClient.invalidateQueries({
        queryKey: ["message", workspaceId],
        exact: false,
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
  messageId: string | undefined,
  threadCount?: number,
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
      threadCount !== 0 &&
      !messageId.includes("temp") &&
      !!params?.entity_type &&
      !!params?.entity_id,
  });

  return { data, isLoadingThread, threadError };
};

/**
 * Unified hook for message operations (convenience hook)
 */
export const useMessageOperations = (
  workspaceId: string,
  entityId?: string,
  type?: string
) => {
  const createChannelMessage = useCreateChannelMessage(workspaceId, entityId!);
  const createConversationMessage = useCreateConversationMessage(
    workspaceId,
    entityId!
  );
  const updateMessage = useUpdateMessage(workspaceId);
  const deleteMessage = useDeleteMessage(workspaceId);

  return {
    createMessage:
      entityId && type === "channel"
        ? createChannelMessage
        : createConversationMessage,
    updateMessage,
    deleteMessage,
    createChannelMessage,
    createConversationMessage,
  };
};
