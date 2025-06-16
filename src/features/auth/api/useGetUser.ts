import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { User, ApiResponse } from '@/types/api'

export const useGetUser = (id: string) => {
  const { callApi } = useApi()

  const { data: user, isLoading } = useQuery<ApiResponse<User>>({
    queryKey: ['user', id],
    queryFn: () => callApi(`/users/${id}`),
  })

  return {
    user: user?.data,
    isLoading,
  }
} 