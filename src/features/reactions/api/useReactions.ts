import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { ApiResponse } from '@/types/api'

interface Reaction {
  id: string
  messageId: string
  userId: string
  emoji: string
  createdAt: string
}

export const useReactions = (messageId: string) => {
  const { callApi } = useApi()
  const queryClient = useQueryClient()

  const { data: reactions, isLoading } = useQuery<ApiResponse<Reaction[]>>({
    queryKey: ['reactions', messageId],
    queryFn: () => callApi(`/messages/${messageId}/reactions`),
  })

  const toggleReaction = useMutation({
    mutationFn: (emoji: string) =>
      callApi<ApiResponse<Reaction>>(`/messages/${messageId}/reactions`, 'POST', { emoji }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] })
    },
  })

  const removeReaction = useMutation({
    mutationFn: (id: string) =>
      callApi<ApiResponse<void>>(`/messages/${messageId}/reactions/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', messageId] })
    },
  })

  return {
    reactions: reactions?.data ?? [],
    isLoading,
    toggleReaction,
    removeReaction,
  }
} 