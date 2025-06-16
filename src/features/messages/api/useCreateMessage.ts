import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse, Message } from '@/types/api';

export const useCreateMessage = () => {
  const { callApi } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, channelId, workspaceId, image }: { body: string; channelId: string; workspaceId: string; image?: string }) => {
      const response = await callApi('/messages', {
        method: 'POST',
        body: JSON.stringify({ body, channelId, workspaceId, image }),
      });
      return response.data.messageId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}; 