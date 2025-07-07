import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/conversations-api';
import type { AddConversationParticipantData, ConversationEntity } from '../types';

export const useConversationParticipants = (workspaceId: string, conversationId: string) => {
  const queryClient = useQueryClient();

  const addParticipant = useMutation({
    mutationFn: (data: AddConversationParticipantData) =>
      conversationsApi.addParticipant(workspaceId, conversationId, data),
    onSuccess: () => {
      // Invalidate conversation with members to refresh participant list
      queryClient.invalidateQueries({
        queryKey: ['conversation', workspaceId, conversationId, 'members'],
      });
    },
  });

  const removeParticipant = useMutation({
    mutationFn: (participantId: string) =>
      conversationsApi.removeParticipant(workspaceId, conversationId, participantId),
    onSuccess: () => {
      // Invalidate conversation with members to refresh participant list
      queryClient.invalidateQueries({
        queryKey: ['conversation', workspaceId, conversationId, 'members'],
      });
    },
  });

  const leaveConversation = useMutation({
    mutationFn: () => conversationsApi.leaveConversation(workspaceId, conversationId),
    onSuccess: () => {
      // Remove from conversations list
      queryClient.setQueryData<ConversationEntity[]>(
        ['conversations', workspaceId],
        (old) => old?.filter((conv) => conv.id !== conversationId) || [],
      );

      // Remove all conversation-related caches
      queryClient.removeQueries({
        queryKey: ['conversation', workspaceId, conversationId],
      });
    },
  });

  return {
    addParticipant,
    removeParticipant,
    leaveConversation,
  };
};
