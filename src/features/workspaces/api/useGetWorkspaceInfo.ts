import { useQuery } from '@tanstack/react-query';
import { useApi } from '@/hooks/useApi';
import type { ApiResponse, Workspace } from '@/types/api';

export const useGetWorkspaceInfo = ({ id }: { id: string }) => {
  const { callApi } = useApi();

  const { data, isLoading } = useQuery<ApiResponse<Workspace>>({
    queryKey: ['workspace-info', id],
    queryFn: () => callApi(`/workspaces/${id}/info`),
    enabled: !!id,
  });

  return {
    workspace: data?.data,
    isLoading,
  };
};
