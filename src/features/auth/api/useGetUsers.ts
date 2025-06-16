import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { User, ApiResponse } from '@/types/api'

export const useGetUsers = () => {
  const { callApi } = useApi()

  const { data: users, isLoading } = useQuery<ApiResponse<User[]>>({
    queryKey: ['users'],
    queryFn: () => callApi('/users'),
  })

  return {
    users: users?.data ?? [],
    isLoading,
  }
} 