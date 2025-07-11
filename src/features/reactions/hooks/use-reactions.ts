import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reactionsApi } from '../api/reactions-api';
import type { Reaction } from '../types';
import type { Message } from '@/types/chat';
import { toast } from 'sonner';
import type { CurrentUser } from '@/features/auth';
import { authQueryKeys } from '@/features/auth/query-keys';

interface OptimisticUpdateContext {
  previousChannelData?: any[];
  previousConversationData?: any[];
  previousThreadData?: any[];
}

/**
 * Helper function to update message reactions
 */
function updateMessageReactions(
  message: Message,
  emoji: string,
  currentUser: CurrentUser,
  action: 'add' | 'remove',
): Message {
  if (action === 'add') {
    const existingReaction = message?.reactions?.find((r) => r.value === emoji);

    if (existingReaction) {
      // Check if user already reacted
      const userAlreadyReacted = existingReaction.users.some((u) => u.id === currentUser.id);
      if (userAlreadyReacted) {
        return message;
      } // Don't add duplicate

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
            : r,
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
            users: [currentUser.id],
          },
        ] as unknown as Reaction[],
      };
    }
  } else {
    // Remove reaction
    return {
      ...message,
      reactions: message.reactions
        ?.map((reaction) => {
          if (reaction.value !== emoji) {
            return reaction;
          }

          const updatedUsers = reaction.users.filter((u) => u.id !== currentUser.id);

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
  const addReaction = useReactionMutation(workspaceId, 'add');
  const removeReaction = useReactionMutation(workspaceId, 'remove');

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
const useReactionMutation = (workspaceId: string, action: 'add' | 'remove') => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      reactionsApi.toggleReaction(action, workspaceId, messageId, emoji),

    onMutate: async ({ messageId, emoji }) => {
      // Cancel outgoing refetches
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

      // Snapshot previous values
      const previousChannelData = queryClient.getQueriesData({
        queryKey: ['channel', workspaceId],
        exact: false,
      });
      const previousConversationData = queryClient.getQueriesData({
        queryKey: ['conversation', workspaceId],
        exact: false,
      });
      const previousThreadData = queryClient.getQueriesData({
        queryKey: ['thread', workspaceId],
        exact: false,
      });
      const currentUser = queryClient.getQueryData<CurrentUser>(authQueryKeys.currentUser());

      if (!currentUser) {
        console.error('No current user found for optimistic update');
        return {
          previousChannelData,
          previousConversationData,
          previousThreadData,
        } as OptimisticUpdateContext;
      }

      // Optimistic update function
      const updateFunction = (oldData: any) => {
        if (oldData?.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              messages:
                page.messages?.map((message: Message) => {
                  if (message.id !== messageId) {
                    return message;
                  }
                  return updateMessageReactions(message, emoji, currentUser, action);
                }) || [],
            })),
          };
        } else if (oldData?.messages) {
          return {
            ...oldData,
            messages: oldData.messages.map((message: Message) => {
              if (message.id !== messageId) {
                return message;
              }
              return updateMessageReactions(message, emoji, currentUser, action);
            }),
          };
        } else if (oldData?.replies) {
          return {
            ...oldData,
            replies: oldData.replies.map((message: Message) => {
              if (message.id !== messageId) {
                return message;
              }
              return updateMessageReactions(message, emoji, currentUser, action);
            }),
          };
        }
        return oldData;
      };

      // Apply optimistic updates
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
        queryKey: ['channel', workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['conversation', workspaceId],
        exact: false,
      });
      queryClient.invalidateQueries({
        queryKey: ['thread', workspaceId],
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
  currentUserId: string,
): boolean => {
  const reaction = message?.reactions?.find((r) => r.value === emoji);
  return reaction?.users.some((u) => u.id === currentUserId) ?? false;
};
