import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reactionsApi } from "../api/reactions-api";
import type { Reaction } from "../types";

// Get all reactions for a message
export const useGetReactions = (messageId: string) => {
  return useQuery({
    queryKey: ["reactions", messageId],
    queryFn: () => reactionsApi.getReactions(messageId),
    enabled: !!messageId,
  });
};

// Toggle reaction (add if not exists, remove if exists)
export const useToggleReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      reactionsApi.toggleReaction(messageId, emoji),
    onSuccess: (result, variables) => {
      // Update the reactions cache based on whether reaction was added or removed
      queryClient.setQueryData<Reaction[]>(
        ["reactions", variables.messageId],
        (old) => {
          if (!old) return [];

          if (result.removed) {
            // Remove the reaction
            return old.filter(
              (reaction) =>
                !(
                  reaction.emoji === variables.emoji &&
                  reaction.userId === result.reaction?.userId
                )
            );
          } else if (result.reaction) {
            // Add the new reaction
            return [...old, result.reaction];
          }

          return old;
        }
      );

      // Optionally invalidate to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ["reactions", variables.messageId],
      });
    },
  });
};

// Add reaction to a message
export const useAddReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
      reactionsApi.addReaction(messageId, emoji),
    onSuccess: (newReaction, variables) => {
      // Optimistically add the new reaction
      queryClient.setQueryData<Reaction[]>(
        ["reactions", variables.messageId],
        (old) => (old ? [...old, newReaction] : [newReaction])
      );
    },
  });
};

// Remove reaction from a message
export const useRemoveReaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      reactionId,
    }: {
      messageId: string;
      reactionId: string;
    }) => reactionsApi.removeReaction(messageId, reactionId),
    onSuccess: (_, variables) => {
      // Remove the reaction from cache
      queryClient.setQueryData<Reaction[]>(
        ["reactions", variables.messageId],
        (old) =>
          old?.filter((reaction) => reaction.id !== variables.reactionId) || []
      );
    },
  });
};

// Utility hook to get reaction counts grouped by emoji
export const useReactionCounts = (messageId: string) => {
  const { data: reactions = [], isLoading, error } = useGetReactions(messageId);

  const reactionCounts = reactions.reduce((acc, reaction) => {
    const { emoji } = reaction;
    if (!acc[emoji]) {
      acc[emoji] = {
        emoji,
        count: 0,
        users: [],
        hasUserReacted: false,
      };
    }
    acc[emoji].count++;
    acc[emoji].users.push(reaction.userId);

    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: string[]; hasUserReacted: boolean }>);

  return {
    reactionCounts: Object.values(reactionCounts),
    reactions,
    isLoading,
    error,
  };
};

// Utility hook to check if current user has reacted with specific emoji
export const useHasUserReacted = (
  messageId: string,
  emoji: string,
  currentUserId?: string
) => {
  const { data: reactions = [] } = useGetReactions(messageId);

  const hasReacted = reactions.some(
    (reaction) => reaction.emoji === emoji && reaction.userId === currentUserId
  );

  const userReaction = reactions.find(
    (reaction) => reaction.emoji === emoji && reaction.userId === currentUserId
  );

  return {
    hasReacted,
    userReaction,
  };
};
