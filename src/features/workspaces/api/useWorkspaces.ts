import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Workspace, ApiResponse } from '@/types/api'

export const useWorkspaces = () => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: workspaces, isLoading } = useQuery<ApiResponse<Workspace[]>>({
    queryKey: ['workspaces'],
    queryFn: () => callApi('/workspaces'),
  })

  const createWorkspace = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      callApi<ApiResponse<Workspace>>('/workspaces', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })

  const updateWorkspace = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Workspace> }) =>
      callApi<ApiResponse<Workspace>>(`/workspaces/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })

  const deleteWorkspace = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/workspaces/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })

  return {
    workspaces: workspaces?.data ?? [],
    isLoading,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  }
} 