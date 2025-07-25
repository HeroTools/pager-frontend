import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/conversations-api';
import { conversationsQueryKeys } from '../query-keys';
import type { ConversationEntity, ConversationFilters, CreateConversationData } from '../types';

export const useConversations = (workspaceId: string, filters?: Partial<ConversationFilters>) => {
  const queryClient = useQueryClient();

  const {
    data: conversations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: conversationsQueryKeys.conversations(workspaceId),
    queryFn: () => conversationsApi.getConversations(workspaceId, filters),
    enabled: !!workspaceId,
  });

  const createConversation = useMutation({
    mutationFn: (data: CreateConversationData) =>
      conversationsApi.createConversation(workspaceId, data),
    onSuccess: (newConversation) => {
      queryClient.setQueryData<ConversationEntity[]>(
        conversationsQueryKeys.conversations(workspaceId),
        (old) => (old ? [newConversation, ...old] : [newConversation]),
      );

      queryClient.invalidateQueries({
        queryKey: conversationsQueryKeys.conversations(workspaceId),
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (conversationId: string) =>
      conversationsApi.deleteConversation(workspaceId, conversationId),
    onSuccess: (_, conversationId) => {
      // Remove from conversations list cache
      queryClient.setQueryData<ConversationEntity[]>(
        conversationsQueryKeys.conversations(workspaceId),
        (old) => old?.filter((conversation) => conversation.id !== conversationId) || [],
      );

      // Remove all related caches
      queryClient.removeQueries({
        queryKey: conversationsQueryKeys.conversation(workspaceId, conversationId),
      });

      queryClient.removeQueries({
        queryKey: ['conversation-messages', workspaceId, conversationId],
      });
    },
  });

  return {
    conversations,
    isLoading,
    error,
    createConversation,
    deleteConversation,
  };
};
