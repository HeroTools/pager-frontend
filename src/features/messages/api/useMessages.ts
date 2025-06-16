import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { Message, ApiResponse } from '@/types/api'

export const useMessages = (channelId: string) => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: messages, isLoading } = useQuery<ApiResponse<Message[]>>({
    queryKey: ['messages', channelId],
    queryFn: () => callApi(`/channels/${channelId}/messages`),
  })

  const createMessage = useMutation({
    mutationFn: (data: { content: string }) =>
      callApi<ApiResponse<Message>>(`/channels/${channelId}/messages`, 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })

  const updateMessage = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Message> }) =>
      callApi<ApiResponse<Message>>(`/channels/${channelId}/messages/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
    },
  })

  const deleteMessage = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/channels/${channelId}/messages/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', channelId] })
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