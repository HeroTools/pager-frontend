import { useQuery, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../api/conversations-api';
import type { ConversationEntity } from '../types';

export function useGetConversation(workspaceId: string, conversationId: string) {
  const qc = useQueryClient();

  return useQuery<ConversationEntity>({
    queryKey: ['conversation', workspaceId, conversationId],
    queryFn: () => conversationsApi.getConversation(workspaceId, conversationId),
    enabled: !!workspaceId && !!conversationId,
    // 1. Seed from your list cache
    initialData: () =>
      qc
        .getQueryData<ConversationEntity[]>(['conversations', workspaceId])
        ?.find((c) => c.id === conversationId),
    // 2. Don’t refetch on every mount/focus
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
