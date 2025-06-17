import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export const useApi = () => {
  const supabase = createClient()

  const callApi = useCallback(async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No session found')
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_AWS_API_ENDPOINT}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`)
    }

    return response.json()
  }, [])

  return {
    callApi,
  }
} 