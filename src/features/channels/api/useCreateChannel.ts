import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse, Channel } from '@/types/api';

export const useCreateChannel = () => {
  const { callApi } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, workspaceId }: { name: string; workspaceId: string }) => {
      const response = await callApi('/channels', {
        method: 'POST',
        body: JSON.stringify({ name, workspaceId }),
      });
      // Assuming the backend returns { channelId }
      return response.data.channelId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}; 