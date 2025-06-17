import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/use-api'
import type { ApiResponse } from '@/types/api'

interface Conversation {
  id: string
  workspaceId: string
  participants: string[]
  lastMessage?: {
    id: string
    content: string
    userId: string
    createdAt: string
  }
  createdAt: string
  updatedAt: string
}

export const useConversations = (workspaceId: string) => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: conversations, isLoading } = useQuery<ApiResponse<Conversation[]>>({
    queryKey: ['conversations', workspaceId],
    queryFn: () => callApi(`/workspaces/${workspaceId}/conversations`),
  })

  const createConversation = useMutation({
    mutationFn: (data: { participants: string[] }) =>
      callApi<ApiResponse<Conversation>>(`/workspaces/${workspaceId}/conversations`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] })
    },
  })

  const deleteConversation = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/workspaces/${workspaceId}/conversations/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] })
    },
  })

  return {
    conversations: conversations?.data ?? [],
    isLoading,
    createConversation,
    deleteConversation,
  }
} 