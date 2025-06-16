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

export const useCurrentConversation = (workspaceId: string) => {
  const { callApi } = useApi()

  const { data: conversation, isLoading } = useQuery<ApiResponse<Conversation>>({
    queryKey: ['current-conversation', workspaceId],
    queryFn: () => callApi(`/workspaces/${workspaceId}/conversations/current`),
  })

  return {
    conversation: conversation?.data,
    isLoading,
  }
} 