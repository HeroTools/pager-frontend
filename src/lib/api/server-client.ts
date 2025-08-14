import axios, { type AxiosInstance } from 'axios';
import { createClient } from '@/lib/supabase/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

export const createServerApiClient = async (): Promise<AxiosInstance> => {
  const supabase = await createClient();
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token && {
        'Authorization': `Bearer ${session.access_token}`
      })
    },
    timeout: 30000,
  });

  return client;
};