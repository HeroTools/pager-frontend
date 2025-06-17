import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/api'

export const useCurrentUser = () => {
  const supabase = createClient()

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session found')

      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      return user
    },
  })

  return {
    user,
    isLoading,
  }
}
