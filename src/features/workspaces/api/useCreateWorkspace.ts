import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse, Workspace } from '@/types/api';

export const useCreateWorkspace = () => {
  const { callApi } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const response = await callApi('/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      // Assuming the backend returns { workspaceId }
      return response.data.workspaceId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}; 