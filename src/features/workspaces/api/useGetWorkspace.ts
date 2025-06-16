import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Workspace, ApiResponse } from '@/types/api'

export const useGetWorkspace = (id: string) => {
  const { callApi } = useApi()

  const { data: workspace, isLoading } = useQuery<ApiResponse<Workspace>>({
    queryKey: ['workspace', id],
    queryFn: () => callApi(`/workspaces/${id}`),
  })

  return {
    workspace: workspace?.data,
    isLoading,
  }
}
