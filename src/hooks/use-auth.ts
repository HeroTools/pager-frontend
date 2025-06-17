import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCallback } from 'react'

export const useAuth = () => {
  const router = useRouter()
  const supabase = createClient()

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    router.refresh()
  }, [router])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
    router.refresh()
  }, [router])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.refresh()
  }, [router])

  const getSession = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  }, [])

  return {
    signIn,
    signUp,
    signOut,
    getSession,
  }
} 