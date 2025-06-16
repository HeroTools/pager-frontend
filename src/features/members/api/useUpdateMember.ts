import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse, Member } from '@/types/api';

export const useUpdateMember = () => {
  const { callApi } = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const response = await callApi(`/members/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}; 