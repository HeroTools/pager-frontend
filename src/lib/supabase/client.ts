import { createBrowserClient } from '@supabase/ssr';

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined' || typeof document === 'undefined') {
              return null;
            }
            try {
              const cookies = document.cookie.split(';');
              const cookie = cookies.find((c) => c.trim().startsWith(`${key}=`));
              return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
            } catch (error) {
              console.warn(`Failed to get cookie ${key}:`, error);
              return null;
            }
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') {
              return;
            }
            try {
              document.cookie = `${key}=${encodeURIComponent(
                value,
              )}; path=/; secure; samesite=lax; max-age=2592000`;
            } catch (error) {
              console.warn(`Failed to set cookie ${key}:`, error);
            }
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') {
              return;
            }
            try {
              document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
            } catch (error) {
              console.warn(`Failed to remove cookie ${key}:`, error);
            }
          },
        },
      },
      realtime: {
        worker: true,
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        timeout: 20000,
        reconnectAfterMs: (tries: number) => {
          return Math.min(1000 + tries * 2000, 10000);
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'unowned-frontend',
        },
      },
    },
  );
};

export const supabase = createClient();
