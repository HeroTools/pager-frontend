import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Channel, ApiResponse } from '@/types/api'

export const useChannels = (workspaceId: string) => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: channels, isLoading } = useQuery<ApiResponse<Channel[]>>({
    queryKey: ['channels', workspaceId],
    queryFn: () => callApi(`/workspaces/${workspaceId}/channels`),
  })

  const createChannel = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      callApi<ApiResponse<Channel>>(`/workspaces/${workspaceId}/channels`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] })
    },
  })

  const updateChannel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Channel> }) =>
      callApi<ApiResponse<Channel>>(`/workspaces/${workspaceId}/channels/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] })
    },
  })

  const deleteChannel = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/workspaces/${workspaceId}/channels/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] })
    },
  })

  return {
    channels: channels?.data ?? [],
    isLoading,
    createChannel,
    updateChannel,
    deleteChannel,
  }
} 