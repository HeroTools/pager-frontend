import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse } from '@/types/api';

export const useToggleReaction = () => {
  const { callApi } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, emoji, userId }: { messageId: string; emoji: string; userId: string }) => {
      const response = await callApi('/reactions/toggle', {
        method: 'POST',
        body: JSON.stringify({ messageId, emoji, userId }),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions'] });
    },
  });
};
