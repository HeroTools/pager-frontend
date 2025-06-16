import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
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

export const useGetConversation = (id: string) => {
  const { callApi } = useApi()

  const { data: conversation, isLoading } = useQuery<ApiResponse<Conversation>>({
    queryKey: ['conversation', id],
    queryFn: () => callApi(`/conversations/${id}`),
  })

  return {
    conversation: conversation?.data,
    isLoading,
  }
} 