import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Channel, ApiResponse } from '@/types/api'

export const useGetChannel = (id: string) => {
  const { callApi } = useApi()

  const { data: channel, isLoading } = useQuery<ApiResponse<Channel>>({
    queryKey: ['channel', id],
    queryFn: () => callApi(`/channels/${id}`),
  })

  return {
    channel: channel?.data,
    isLoading,
  }
}
