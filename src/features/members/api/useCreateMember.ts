import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse, Member } from '@/types/api';

export const useCreateMember = () => {
  const { callApi } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, workspaceId, role }: { userId: string; workspaceId: string; role: string }) => {
      const response = await callApi('/members', {
        method: 'POST',
        body: JSON.stringify({ userId, workspaceId, role }),
      });
      return response.data.memberId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}; 