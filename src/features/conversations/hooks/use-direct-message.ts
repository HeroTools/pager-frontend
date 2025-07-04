import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/conversations-api';
import type { ConversationEntity } from '../types';

export const useDirectMessage = (workspaceId: string) => {
  const queryClient = useQueryClient();

  const getOrCreateDirectMessage = useMutation({
    mutationFn: (participantUserId: string) =>
      conversationsApi.getOrCreateDirectMessage(workspaceId, participantUserId),
    onSuccess: (conversation) => {
      // Add to conversations cache if not already there
      queryClient.setQueryData<ConversationEntity[]>(['conversations', workspaceId], (old) => {
        if (!old?.find((conv) => conv.id === conversation.id)) {
          return old ? [...old, conversation] : [conversation];
        }
        return old;
      });
    },
  });

  return {
    getOrCreateDirectMessage,
  };
};
