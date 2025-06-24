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

  const getInfiniteQueryKey = () => [
    "channel",
    workspaceId,
    channelId,
    "messages",
    "infinite",
  ];

  const getThreadQueryKey = (threadParentId: string) => [
    "thread",
    workspaceId,
    threadParentId,
  ];

  return useMutation({
    mutationKey: ["createChannelMessage", workspaceId, channelId],

    mutationFn: (data: CreateMessageData) =>
      messagesApi.createChannelMessage(workspaceId, channelId, {
        body: data.body,
        attachment_ids: data.attachments?.map((att) => att.id),
        parent_message_id: data.parent_message_id,
        thread_id: data.thread_id,
        message_type: data.message_type,
      }),

    onMutate: async (data) => {
      const threadParentId = data.parent_message_id || data.thread_id;
      const isThreadMessage = Boolean(threadParentId);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: getInfiniteQueryKey() });
      if (isThreadMessage) {
        await queryClient.cancelQueries({
          queryKey: getThreadQueryKey(threadParentId),
        });
      }

      // Snapshot the previous values
      const previousChannelMessages = queryClient.getQueryData(
        getInfiniteQueryKey()
      );
      const previousThreadMessages = isThreadMessage
        ? queryClient.getQueryData(getThreadQueryKey(threadParentId))
        : null;

      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      const optimisticMessage: MessageWithUser = {
        id: data._optimisticId || `temp-${Date.now()}-${Math.random()}`,
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

      // Optimistically update the cache
      if (isThreadMessage) {
        // Update thread messages
        queryClient.setQueryData(
          getThreadQueryKey(threadParentId),
          (old: any) => {
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
          }
        );

        // Update thread reply count in channel
        queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
          if (!old?.pages) return old;
          const updatedPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.id === threadParentId
                ? {
                    ...msg,
                    thread_reply_count: (msg.thread_reply_count || 0) + 1,
                  }
                : msg
            ),
          }));
          return { ...old, pages: updatedPages };
        });
      } else {
        // Update channel messages
        queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
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

          // Add to the beginning of the first page
          newPages[0] = {
            ...firstPage,
            messages: [optimisticMessage, ...firstPage.messages],
            pagination: {
              ...firstPage.pagination,
              totalCount: (firstPage.pagination.totalCount || 0) + 1,
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
      };
    },

    // If the mutation fails, rollback
    onError: (error, variables, context) => {
      if (context?.previousChannelMessages) {
        queryClient.setQueryData(
          getInfiniteQueryKey(),
          context.previousChannelMessages
        );
      }

      if (
        context?.isThreadMessage &&
        context?.threadParentId &&
        context?.previousThreadMessages
      ) {
        queryClient.setQueryData(
          getThreadQueryKey(context.threadParentId),
          context.previousThreadMessages
        );
      }

      console.error("Failed to send channel message:", error);
      toast.error("Failed to send message. Please try again.");
    },

    // Always refetch after error or success
    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({ queryKey: getInfiniteQueryKey() });

      if (context?.isThreadMessage && context?.threadParentId) {
        queryClient.invalidateQueries({
          queryKey: getThreadQueryKey(context.threadParentId),
        });
      }
    },
  });
};

export const useCreateConversationMessage = (
  workspaceId: string,
  conversationId: string
) => {
  const queryClient = useQueryClient();

  const getInfiniteQueryKey = () => [
    "conversation",
    workspaceId,
    conversationId,
    "messages",
    "infinite",
  ];

  const getThreadQueryKey = (threadParentId: string) => [
    "thread",
    workspaceId,
    threadParentId,
  ];

  return useMutation({
    mutationKey: ["createConversationMessage", workspaceId, conversationId],

    mutationFn: (data: CreateMessageData) =>
      messagesApi.createConversationMessage(workspaceId, conversationId, {
        body: data.body,
        attachment_ids: data.attachments?.map((attachment) => attachment.id),
        parent_message_id: data.parent_message_id,
        thread_id: data.thread_id,
        message_type: data.message_type,
      }),

    onMutate: async (data) => {
      const threadParentId = data.parent_message_id || data.thread_id;
      const isThreadMessage = Boolean(threadParentId);

      await queryClient.cancelQueries({
        queryKey: getInfiniteQueryKey(),
      });
      if (isThreadMessage) {
        await queryClient.cancelQueries({
          queryKey: getThreadQueryKey(threadParentId),
        });
      }

      const previousMessages = queryClient.getQueryData(getInfiniteQueryKey());
      const previousThreadMessages = isThreadMessage
        ? queryClient.getQueryData(getThreadQueryKey(threadParentId))
        : null;
      const currentUser = queryClient.getQueryData(["current-user"]) as any;

      const tempMessage: MessageWithUser = {
        id: data._optimisticId || `temp-${Date.now()}-${Math.random()}`,
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

      if (isThreadMessage) {
        queryClient.setQueryData(
          getThreadQueryKey(threadParentId),
          (old: any) => {
            if (!old) {
              return {
                replies: [tempMessage],
                pagination: { hasMore: false, nextCursor: null, totalCount: 1 },
              };
            }
            return {
              ...old,
              replies: [...(old.replies || []), tempMessage],
              pagination: {
                ...old.pagination,
                totalCount: (old.pagination?.totalCount || 0) + 1,
              },
            };
          }
        );

        queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
          if (!old?.pages) return old;
          const updatedPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.id === threadParentId
                ? {
                    ...msg,
                    thread_reply_count: (msg.thread_reply_count || 0) + 1,
                  }
                : msg
            ),
          }));
          return { ...old, pages: updatedPages };
        });
      } else {
        queryClient.setQueryData(getInfiniteQueryKey(), (old: any) => {
          if (!old || !old.pages || old.pages.length === 0) {
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
      }

      return {
        previousMessages,
        previousThreadMessages,
        tempMessage,
        isThreadMessage,
        threadParentId,
      };
    },

    onError: (error, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          getInfiniteQueryKey(),
          context.previousMessages
        );
      }

      if (
        context?.isThreadMessage &&
        context?.threadParentId &&
        context?.previousThreadMessages
      ) {
        queryClient.setQueryData(
          getThreadQueryKey(context.threadParentId),
          context.previousThreadMessages
        );
      }

      console.error("Failed to send conversation message:", error);
    },

    onSettled: (data, error, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: getInfiniteQueryKey(),
      });

      if (context?.isThreadMessage && context?.threadParentId) {
        queryClient.invalidateQueries({
          queryKey: getThreadQueryKey(context.threadParentId),
        });
      }
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
