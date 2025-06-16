import { useMutation } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse } from '@/types/api';

export const useGenerateUploadUrl = () => {
  const { callApi } = useApi();

  return useMutation({
    mutationFn: async () => {
      const response = await callApi('/upload/url', {
        method: 'GET',
      });
      return response.data.url;
    },
  });
};
