import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reactionsApi } from './reactions-api';
import type { Reaction } from './reactions-api';

// Get reactions for a message
export const useGetReactions = (messageId: string) => {
  return useQuery({
    queryKey: ['reactions', messageId],
    queryFn: () => reactionsApi.getReactions(messageId),
  });
};

export const useToggleReaction = (messageId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ emoji }: { emoji: string }) =>
      reactionsApi.toggleReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] });
    },
  });
};

// Keeping these for backward compatibility, but they should be deprecated
export const useAddReaction = (messageId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ emoji }: { emoji: string }) =>
      reactionsApi.addReaction(messageId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] });
    },
  });
};

export const useRemoveReaction = (messageId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reactionId }: { reactionId: string }) =>
      reactionsApi.removeReaction(messageId, reactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] });
    },
  });
}; 