import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse } from '@/types/api';

export const useNewJoinCode = () => {
  const { callApi } = useApi();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      const response = await callApi('/workspaces/join-code', {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      });
      return response.data.code;
    },
  });
};
