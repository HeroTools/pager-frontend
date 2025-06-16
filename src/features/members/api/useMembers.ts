import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Member, ApiResponse } from '@/types/api'

export const useMembers = (workspaceId: string) => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: members, isLoading } = useQuery<ApiResponse<Member[]>>({
    queryKey: ['members', workspaceId],
    queryFn: () => callApi(`/workspaces/${workspaceId}/members`),
  })

  const addMember = useMutation({
    mutationFn: (data: { userId: string; role: Member['role'] }) =>
      callApi<ApiResponse<Member>>(`/workspaces/${workspaceId}/members`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] })
    },
  })

  const updateMember = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Member> }) =>
      callApi<ApiResponse<Member>>(`/workspaces/${workspaceId}/members/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] })
    },
  })

  const removeMember = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/workspaces/${workspaceId}/members/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', workspaceId] })
    },
  })

  return {
    members: members?.data ?? [],
    isLoading,
    addMember,
    updateMember,
    removeMember,
  }
} 