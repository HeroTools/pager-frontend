import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Member, ApiResponse } from '@/types/api'

export const useGetMember = (id: string) => {
  const { callApi } = useApi()

  const { data: member, isLoading } = useQuery<ApiResponse<Member>>({
    queryKey: ['member', id],
    queryFn: () => callApi(`/members/${id}`),
  })

  return {
    member: member?.data,
    isLoading,
  }
}
