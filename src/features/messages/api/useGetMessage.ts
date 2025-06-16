import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Message, ApiResponse } from '@/types/api'

export const useGetMessage = (id: string) => {
  const { callApi } = useApi()

  const { data: message, isLoading } = useQuery<ApiResponse<Message>>({
    queryKey: ['message', id],
    queryFn: () => callApi(`/messages/${id}`),
  })

  return {
    message: message?.data,
    isLoading,
  }
}
