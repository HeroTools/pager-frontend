import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { authQueryKeys } from '@/features/auth/query-keys';
import { conversationsQueryKeys } from '@/features/conversations/query-keys';
import type { UploadedAttachment } from '@/features/file-upload/types';
import { messagesApi } from '../api/messages-api';
import type {
  CreateChannelMessageData,
  CreateConversationMessageData,
  CreateMessageData,
  CurrentUser,
  MessageMutationContext,
  MessageRepliesParams,
  MessagesInfiniteData,
  MessageThread,
  MessageWithUser,
  ThreadData,
  UpdateMessageContext,
  UpdateMessageData,
} from '../types';

export const useCreateChannelMessage = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient();

  const getInfiniteQueryKey = useCallback(
    (): readonly unknown[] => ['channel', workspaceId, channelId, 'messages', 'infinite'],
    [workspaceId, channelId],
  );

  const getThreadQueryKey = useCallback(
    (threadParentId: string): readonly unknown[] => ['thread', workspaceId, threadParentId],
    [workspaceId],
  );

  return useMutation<MessageWithUser, Error, CreateMessageData, MessageMutationContext>({
    mutationKey: ['createChannelMessage', workspaceId, channelId],

    mutationFn: async (data: CreateMessageData): Promise<MessageWithUser> => {
      const apiData: CreateChannelMessageData = {
        body: data.body,
        attachment_ids: data.attachments?.map((att) => att.id),
        parent_message_id: data.parent_message_id,
        thread_id: data.thread_id,
        message_type: data.message_type,
        plain_text: data.plain_text,
      };

      const result = await messagesApi.createChannelMessage(workspaceId, channelId, apiData);
      return result;
    },

    onMutate: async (data: CreateMessageData): Promise<MessageMutationContext> => {
      const threadParentId = data.parent_message_id || data.thread_id;
      const isThreadMessage = Boolean(threadParentId);
      const queryKey = getInfiniteQueryKey();
      const threadQueryKey =
        isThreadMessage && threadParentId ? getThreadQueryKey(threadParentId) : null;

      await queryClient.cancelQueries({ queryKey });
      if (isThreadMessage && threadQueryKey) {
        await queryClient.cancelQueries({ queryKey: threadQueryKey });
      }

      const previousChannelMessages = queryClient.getQueryData<MessagesInfiniteData>(queryKey);
      const previousThreadMessages =
        isThreadMessage && threadQueryKey
          ? queryClient.getQueryData<ThreadData>(threadQueryKey)
          : undefined;

      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());

      if (!currentUser) {
        console.error('No current user found for optimistic update');
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
        message_type: data.message_type || 'channel',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        parent_message_id: data.parent_message_id || null,
        thread_id: data.thread_id || null,
        workspace_member_id: currentUser.workspace_member_id,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
        },
        attachments:
          data.attachments?.map((attachment: UploadedAttachment) => ({
            id: attachment.id,
            public_url: attachment.publicUrl,
            content_type: attachment.contentType,
            size_bytes: attachment.sizeBytes,
            s3_bucket: '',
            s3_key: '',
            uploaded_by: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) || [],
        reactions: [],
        thread_reply_count: 0,
        thread_last_reply_at: null,
        thread_participants: [],
        _isOptimistic: true,
      };

      if (isThreadMessage && threadQueryKey && threadParentId) {
        let isFirstThreadMessage = false;
        const channelData = queryClient.getQueryData<MessagesInfiniteData>(queryKey);

        if (channelData?.pages) {
          for (const page of channelData.pages) {
            const parentMessage = page.messages.find((msg) => msg.id === threadParentId);
            if (parentMessage) {
              isFirstThreadMessage = (parentMessage.thread_reply_count || 0) === 0;
              break;
            }
          }
        }

        const existingThreadData = queryClient.getQueryData<ThreadData>(threadQueryKey);

        if (isFirstThreadMessage || existingThreadData) {
          queryClient.setQueryData<ThreadData>(threadQueryKey, (old) => {
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

        queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
          if (!old?.pages?.length) {
            return old;
          }

          const updatedPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) => {
              if (msg.id === threadParentId) {
                const currentParticipants = msg.thread_participants || [];
                const messageUser = optimisticMessage.user;

                const updatedParticipants =
                  messageUser && !currentParticipants.some((id) => id === messageUser.id)
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
        queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
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

          const messageExists = firstPage.messages.some((msg) => msg.id === optimisticMessage.id);

          if (messageExists) {
            return old;
          }

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

      return {
        previousChannelMessages,
        previousThreadMessages,
        isThreadMessage,
        threadParentId,
        optimisticId: optimisticMessage.id,
      };
    },

    onSuccess: (
      realMessage: MessageWithUser,
      _variables: CreateMessageData,
      context?: MessageMutationContext,
    ) => {
      const queryKey = getInfiniteQueryKey();
      const isThreadMessage = context?.isThreadMessage;
      const threadParentId = context?.threadParentId;

      if (context?.optimisticId && realMessage) {
        queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
          if (!old?.pages?.length) {
            return old;
          }

          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
              msg.id === context.optimisticId ? { ...realMessage, _isOptimistic: false } : msg,
            ),
          }));

          return { ...old, pages: newPages };
        });

        if (isThreadMessage && threadParentId) {
          const threadQueryKey = getThreadQueryKey(threadParentId);
          queryClient.setQueryData<ThreadData>(threadQueryKey, (old) => {
            if (!old?.replies) {
              return old;
            }

            return {
              ...old,
              replies: old.replies.map((reply) =>
                reply.id === context.optimisticId
                  ? { ...realMessage, _isOptimistic: false }
                  : reply,
              ),
            };
          });

          if (realMessage.parent_message_id) {
            queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
              if (!old?.pages?.length) {
                return old;
              }

              const updatedPages = old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((msg) => {
                  if (msg.id === realMessage.parent_message_id) {
                    return {
                      ...msg,
                      thread_reply_count: realMessage.thread_reply_count || msg.thread_reply_count,
                      thread_last_reply_at: realMessage.created_at,
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

    onError: (error: Error, _variables: CreateMessageData, context?: MessageMutationContext) => {
      console.error('Failed to send channel message:', error);

      const queryKey = getInfiniteQueryKey();

      if (context?.previousChannelMessages) {
        queryClient.setQueryData(queryKey, context.previousChannelMessages);
      }

      if (context?.isThreadMessage && context?.threadParentId && context?.previousThreadMessages) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.setQueryData(threadQueryKey, context.previousThreadMessages);
      }

      toast.error('Failed to send message. Please try again.');
    },

    onSettled: (_data, _error, _variables, context) => {
      const queryKey = getInfiniteQueryKey();

      queryClient.invalidateQueries({
        queryKey,
        exact: true,
        refetchType: 'none',
      });

      if (context?.isThreadMessage && context?.threadParentId) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.invalidateQueries({
          queryKey: threadQueryKey,
          exact: true,
          refetchType: 'none',
        });
      }

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

export const useCreateConversationMessage = (workspaceId: string, conversationId: string) => {
  const queryClient = useQueryClient();

  const getInfiniteQueryKey = useCallback(
    (): readonly unknown[] => ['conversation', workspaceId, conversationId, 'messages', 'infinite'],
    [workspaceId, conversationId],
  );

  const getThreadQueryKey = useCallback(
    (threadParentId: string): readonly unknown[] => ['thread', workspaceId, threadParentId],
    [workspaceId],
  );

  return useMutation<MessageWithUser, Error, CreateMessageData, MessageMutationContext>({
    mutationKey: ['createConversationMessage', workspaceId, conversationId],

    mutationFn: async (data: CreateMessageData): Promise<MessageWithUser> => {
      const apiData: CreateConversationMessageData = {
        body: data.body,
        attachment_ids: data.attachments?.map((att) => att.id),
        parent_message_id: data.parent_message_id,
        thread_id: data.thread_id,
        message_type: data.message_type,
        plain_text: data.plain_text,
      };

      const result = await messagesApi.createConversationMessage(
        workspaceId,
        conversationId,
        apiData,
      );
      return result;
    },

    onMutate: async (data: CreateMessageData): Promise<MessageMutationContext> => {
      const threadParentId = data.parent_message_id || data.thread_id;
      const isThreadMessage = Boolean(threadParentId);
      const queryKey = getInfiniteQueryKey();
      const threadQueryKey =
        isThreadMessage && threadParentId ? getThreadQueryKey(threadParentId) : null;

      await queryClient.cancelQueries({ queryKey });
      if (isThreadMessage && threadQueryKey) {
        await queryClient.cancelQueries({ queryKey: threadQueryKey });
      }

      const previousConversationMessages = queryClient.getQueryData<MessagesInfiniteData>(queryKey);
      const previousThreadMessages =
        isThreadMessage && threadQueryKey
          ? queryClient.getQueryData<ThreadData>(threadQueryKey)
          : undefined;

      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());

      if (!currentUser) {
        console.error('No current user found for optimistic update');
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
        message_type: data.message_type || 'direct',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        parent_message_id: data.parent_message_id || null,
        thread_id: data.thread_id || null,
        workspace_member_id: currentUser.workspace_member_id,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          image: currentUser.image,
        },
        attachments:
          data.attachments?.map((attachment: UploadedAttachment) => ({
            id: attachment.id,
            public_url: attachment.publicUrl,
            content_type: attachment.contentType,
            size_bytes: attachment.sizeBytes,
            s3_bucket: '',
            s3_key: '',
            uploaded_by: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })) || [],
        reactions: [],
        thread_reply_count: 0,
        thread_last_reply_at: null,
        thread_participants: [],
        _isOptimistic: true,
      };

      if (isThreadMessage && threadQueryKey && threadParentId) {
        let isFirstThreadMessage = false;
        const conversationData = queryClient.getQueryData<MessagesInfiniteData>(queryKey);

        if (conversationData?.pages) {
          for (const page of conversationData.pages) {
            const parentMessage = page.messages.find((msg) => msg.id === threadParentId);
            if (parentMessage) {
              isFirstThreadMessage = (parentMessage.thread_reply_count || 0) === 0;
              break;
            }
          }
        }

        const existingThreadData = queryClient.getQueryData<ThreadData>(threadQueryKey);

        if (isFirstThreadMessage || existingThreadData) {
          queryClient.setQueryData<ThreadData>(threadQueryKey, (old) => {
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

        queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
          if (!old?.pages?.length) {
            return old;
          }

          const updatedPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) => {
              if (msg.id === threadParentId) {
                const currentParticipants = msg.thread_participants || [];
                const messageUser = optimisticMessage.user;

                const updatedParticipants =
                  messageUser && !currentParticipants.some((id) => id === messageUser.id)
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
        queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
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

          const messageExists = firstPage.messages.some((msg) => msg.id === optimisticMessage.id);

          if (messageExists) {
            return old;
          }

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

      return {
        previousConversationMessages,
        previousThreadMessages,
        isThreadMessage,
        threadParentId,
        optimisticId: optimisticMessage.id,
      };
    },

    onSuccess: (
      realMessage: MessageWithUser,
      _variables: CreateMessageData,
      context?: MessageMutationContext,
    ) => {
      const queryKey = getInfiniteQueryKey();
      const isThreadMessage = context?.isThreadMessage;
      const threadParentId = context?.threadParentId;

      if (context?.optimisticId && realMessage) {
        queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
          if (!old?.pages?.length) {
            return old;
          }

          const newPages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) =>
              msg.id === context.optimisticId ? { ...realMessage, _isOptimistic: false } : msg,
            ),
          }));

          return { ...old, pages: newPages };
        });

        if (isThreadMessage && threadParentId) {
          const threadQueryKey = getThreadQueryKey(threadParentId);
          queryClient.setQueryData<ThreadData>(threadQueryKey, (old) => {
            if (!old?.replies) {
              return old;
            }

            return {
              ...old,
              replies: old.replies.map((reply) =>
                reply.id === context.optimisticId
                  ? { ...realMessage, _isOptimistic: false }
                  : reply,
              ),
            };
          });

          if (realMessage.parent_message_id) {
            queryClient.setQueryData<MessagesInfiniteData>(queryKey, (old) => {
              if (!old?.pages?.length) {
                return old;
              }

              const updatedPages = old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((msg) => {
                  if (msg.id === realMessage.parent_message_id) {
                    return {
                      ...msg,
                      thread_reply_count: realMessage.thread_reply_count || msg.thread_reply_count,
                      thread_last_reply_at: realMessage.created_at,
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

    onError: (error: Error, _variables: CreateMessageData, context?: MessageMutationContext) => {
      console.error('Failed to send conversation message:', error);

      const queryKey = getInfiniteQueryKey();

      if (context?.previousConversationMessages) {
        queryClient.setQueryData(queryKey, context.previousConversationMessages);
      }

      if (context?.isThreadMessage && context?.threadParentId && context?.previousThreadMessages) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.setQueryData(threadQueryKey, context.previousThreadMessages);
      }

      toast.error('Failed to send message. Please try again.');
    },

    onSettled: (_data, _error, _variables, context) => {
      const queryKey = getInfiniteQueryKey();

      queryClient.invalidateQueries({
        queryKey,
        exact: true,
        refetchType: 'none',
      });

      if (context?.isThreadMessage && context?.threadParentId) {
        const threadQueryKey = getThreadQueryKey(context.threadParentId);
        queryClient.invalidateQueries({
          queryKey: threadQueryKey,
          exact: true,
          refetchType: 'none',
        });
      }

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

export const useUpdateMessage = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<
    { messageId: string; updatedAt: string },
    Error,
    { messageId: string; data: UpdateMessageData },
    UpdateMessageContext
  >({
    mutationFn: ({ messageId, data }): Promise<{ messageId: string; updatedAt: string }> =>
      messagesApi.updateMessage(workspaceId, messageId, data),

    onMutate: async ({ messageId, data }): Promise<UpdateMessageContext> => {
      await queryClient.cancelQueries({
        queryKey: ['channel', workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ['conversation', workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ['thread', workspaceId],
        exact: false,
      });

      const previousData: UpdateMessageContext = {
        channels: queryClient.getQueriesData({
          queryKey: ['channel', workspaceId],
          exact: false,
        }),
        conversations: queryClient.getQueriesData({
          queryKey: ['conversation', workspaceId],
          exact: false,
        }),
        threads: queryClient.getQueriesData({
          queryKey: ['thread', workspaceId],
          exact: false,
        }),
      };

      const updateFunction = (oldData: unknown): unknown => {
        if (oldData && typeof oldData === 'object' && 'pages' in oldData) {
          const infiniteData = oldData as MessagesInfiniteData;
          return {
            ...infiniteData,
            pages: infiniteData.pages.map((page) => ({
              ...page,
              messages:
                page.messages?.map((message) =>
                  message.id === messageId
                    ? {
                        ...message,
                        body: data.body ?? message.body,
                        edited_at: new Date().toISOString(),
                      }
                    : message,
                ) || [],
            })),
          };
        } else if (oldData && typeof oldData === 'object' && 'messages' in oldData) {
          const regularData = oldData as { messages: MessageWithUser[] };
          return {
            ...regularData,
            messages: regularData.messages.map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    body: data.body ?? message.body,
                    edited_at: new Date().toISOString(),
                  }
                : message,
            ),
          };
        }
        return oldData;
      };

      queryClient.setQueriesData(
        { queryKey: ['channel', workspaceId], exact: false },
        updateFunction,
      );
      queryClient.setQueriesData(
        { queryKey: ['conversation', workspaceId], exact: false },
        updateFunction,
      );
      queryClient.setQueriesData(
        { queryKey: ['thread', workspaceId], exact: false },
        updateFunction,
      );

      return previousData;
    },

    onError: (error: Error, _variables, context?: UpdateMessageContext) => {
      console.error('Failed to update message:', error);

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

      toast.error('Failed to update message. Please try again.');
    },
  });
};

export const useDeleteMessage = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, UpdateMessageContext>({
    mutationFn: (messageId: string): Promise<void> =>
      messagesApi.deleteMessage(workspaceId, messageId),

    onMutate: async (messageId: string): Promise<UpdateMessageContext> => {
      await queryClient.cancelQueries({
        queryKey: ['channel', workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ['conversation', workspaceId],
        exact: false,
      });
      await queryClient.cancelQueries({
        queryKey: ['thread', workspaceId],
        exact: false,
      });

      const previousData: UpdateMessageContext = {
        channels: queryClient.getQueriesData({
          queryKey: ['channel', workspaceId],
          exact: false,
        }),
        conversations: queryClient.getQueriesData({
          queryKey: ['conversation', workspaceId],
          exact: false,
        }),
        threads: queryClient.getQueriesData({
          queryKey: ['thread', workspaceId],
          exact: false,
        }),
      };

      const updateFunction = (oldData: unknown): unknown => {
        if (oldData && typeof oldData === 'object' && 'pages' in oldData) {
          const infiniteData = oldData as MessagesInfiniteData;
          return {
            ...infiniteData,
            pages: infiniteData.pages.map((page) => ({
              ...page,
              messages:
                page.messages?.map((message) => {
                  if (message.id === messageId) {
                    return { ...message, deleted_at: new Date().toISOString() };
                  }

                  const deletedMessage = page.messages?.find((m) => m.id === messageId);
                  if (
                    deletedMessage?.thread_id === message.id ||
                    deletedMessage?.parent_message_id === message.id
                  ) {
                    const currentCount = message.thread_reply_count || 0;
                    return {
                      ...message,
                      thread_reply_count: Math.max(0, currentCount - 1),
                    };
                  }

                  return message;
                }) || [],
            })),
          };
        } else if (oldData && typeof oldData === 'object' && 'messages' in oldData) {
          const regularData = oldData as { messages: MessageWithUser[] };
          return {
            ...regularData,
            messages: regularData.messages.map((message) => {
              if (message.id === messageId) {
                return { ...message, deleted_at: new Date().toISOString() };
              }

              const deletedMessage = regularData.messages?.find((m) => m.id === messageId);
              if (
                deletedMessage?.thread_id === message.id ||
                deletedMessage?.parent_message_id === message.id
              ) {
                const currentCount = message.thread_reply_count || 0;
                return {
                  ...message,
                  thread_reply_count: Math.max(0, currentCount - 1),
                };
              }

              return message;
            }),
          };
        } else if (oldData && typeof oldData === 'object' && 'replies' in oldData) {
          const threadData = oldData as ThreadData;
          return {
            ...threadData,
            replies: threadData.replies.map((message) =>
              message.id === messageId
                ? { ...message, deleted_at: new Date().toISOString() }
                : message,
            ),
          };
        }
        return oldData;
      };

      queryClient.setQueriesData(
        { queryKey: ['channel', workspaceId], exact: false },
        updateFunction,
      );
      queryClient.setQueriesData(
        { queryKey: ['conversation', workspaceId], exact: false },
        updateFunction,
      );
      queryClient.setQueriesData(
        { queryKey: ['thread', workspaceId], exact: false },
        updateFunction,
      );

      return previousData;
    },

    onError: (error: Error, _messageId: string, context?: UpdateMessageContext) => {
      console.error('Failed to delete message:', error);

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

      toast.error('Failed to delete message. Please try again.');
    },

    onSuccess: () => {
      toast.success('Message deleted successfully');

      queryClient.invalidateQueries({
        queryKey: ['channels', workspaceId],
      });
      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.conversations(workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: ['thread', workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['channel', workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['conversation', workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['message', workspaceId],
        exact: false,
      });
    },
  });
};

export const useMessageReplies = (
  workspaceId: string,
  messageId: string | undefined,
  threadCount?: number,
  params?: MessageRepliesParams,
) => {
  const {
    data,
    isLoading: isLoadingThread,
    error: threadError,
  } = useQuery({
    queryKey: ['thread', workspaceId, messageId],
    queryFn: (): Promise<MessageThread> =>
      messagesApi.getMessageReplies({
        workspaceId,
        messageId: messageId!,
        params: {
          limit: params?.limit || 50,
          include_reactions: 'true',
          include_attachments: 'true',
          entity_type: params?.entity_type,
          entity_id: params?.entity_id,
        },
      }),
    enabled:
      !!workspaceId &&
      !!messageId &&
      threadCount !== 0 &&
      !messageId.includes('temp') &&
      !!params?.entity_type &&
      !!params?.entity_id,
  });

  return { data, isLoadingThread, threadError } as const;
};

export function useGetMessageById(workspaceId: string, messageId: string) {
  return useQuery({
    queryKey: ['message', workspaceId, messageId],
    queryFn: (): Promise<MessageWithUser> => messagesApi.getMessageById(workspaceId, messageId),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export const useMessageOperations = (workspaceId: string, entityId?: string, type?: string) => {
  const createChannelMessage = useCreateChannelMessage(workspaceId, entityId);
  const createConversationMessage = useCreateConversationMessage(workspaceId, entityId);
  const updateMessage = useUpdateMessage(workspaceId);
  const deleteMessage = useDeleteMessage(workspaceId);

  return {
    createMessage:
      entityId && type === 'channel' ? createChannelMessage : createConversationMessage,
    updateMessage,
    deleteMessage,
    createChannelMessage,
    createConversationMessage,
  };
};
