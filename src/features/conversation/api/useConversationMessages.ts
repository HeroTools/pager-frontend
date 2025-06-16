import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { ApiResponse } from '@/types/api'

interface ConversationMessage {
  id: string
  conversationId: string
  content: string
  userId: string
  createdAt: string
  updatedAt: string
}

export const useConversationMessages = (conversationId: string) => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: messages, isLoading } = useQuery<ApiResponse<ConversationMessage[]>>({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => callApi(`/conversations/${conversationId}/messages`),
  })

  const createMessage = useMutation({
    mutationFn: (data: { content: string }) =>
      callApi<ApiResponse<ConversationMessage>>(`/conversations/${conversationId}/messages`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] })
    },
  })

  const updateMessage = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ConversationMessage> }) =>
      callApi<ApiResponse<ConversationMessage>>(`/conversations/${conversationId}/messages/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] })
    },
  })

  const deleteMessage = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/conversations/${conversationId}/messages/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] })
    },
  })

  return {
    messages: messages?.data ?? [],
    isLoading,
    createMessage,
    updateMessage,
    deleteMessage,
  }
} 