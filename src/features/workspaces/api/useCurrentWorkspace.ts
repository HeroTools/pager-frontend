import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Workspace, ApiResponse } from '@/types/api'

export const useCurrentWorkspace = () => {
  const { callApi } = useApi()

  const { data: workspace, isLoading } = useQuery<ApiResponse<Workspace>>({
    queryKey: ['current-workspace'],
    queryFn: () => callApi('/workspaces/current'),
  })

  return {
    workspace: workspace?.data,
    isLoading,
  }
} 