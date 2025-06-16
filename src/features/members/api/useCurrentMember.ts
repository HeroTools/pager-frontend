import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Member, ApiResponse } from '@/types/api'

export const useCurrentMember = (workspaceId: string) => {
  const { callApi } = useApi()

  const { data: member, isLoading } = useQuery<ApiResponse<Member>>({
    queryKey: ['current-member', workspaceId],
    queryFn: () => callApi(`/workspaces/${workspaceId}/members/current`),
  })

  return {
    member: member?.data,
    isLoading,
  }
}
