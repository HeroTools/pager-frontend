import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Channel, ApiResponse } from '@/types/api'

export const useCurrentChannel = (workspaceId: string) => {
  const { callApi } = useApi()

  const { data: channel, isLoading } = useQuery<ApiResponse<Channel>>({
    queryKey: ['current-channel', workspaceId],
    queryFn: () => callApi(`/workspaces/${workspaceId}/channels/current`),
  })

  return {
    channel: channel?.data,
    isLoading,
  }
} 