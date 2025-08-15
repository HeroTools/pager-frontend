import { supabase } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import axios, {
  type AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;

// Token refresh state management
interface RefreshState {
  isRefreshing: boolean;
  refreshPromise: Promise<string | null> | null;
}

const refreshState: RefreshState = {
  isRefreshing: false,
  refreshPromise: null,
};

// Queue for requests waiting for token refresh
const failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });
  failedQueue.length = 0;
};

/**
 * Check if we're running on the server
 */
const isServer = typeof window === 'undefined';

/**
 * Get a fresh access token, refreshing if necessary
 * Works in both client and server contexts
 */
async function getAccessToken(): Promise<string | null> {
  try {
    if (isServer) {
      // Server-side: create server Supabase client
      const supabaseServer = await createServerClient();
      const {
        data: { session },
        error,
      } = await supabaseServer.auth.getSession();

      if (error || !session?.access_token) {
        return null;
      }
      return session.access_token;
    } else {
      // Client-side: use existing client logic
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        return null;
      }

      // Check if token needs refresh (5 minutes before expiry)
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const shouldRefresh = expiresAt - now < 300; // 5 minutes buffer

      if (shouldRefresh) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          console.error('Token refresh failed:', refreshError);
          return null;
        }
        return refreshData.session.access_token;
      }

      return session.access_token;
    }
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Skip auth for public endpoints
    const isPublicEndpoint =
      config.url?.includes('/public/') ||
      config.url?.includes('/auth/sign-') ||
      config.url?.includes('/auth/register');

    if (isPublicEndpoint) {
      return config;
    }

    try {
      // If already refreshing, wait for it
      if (refreshState.isRefreshing && refreshState.refreshPromise) {
        const token = await refreshState.refreshPromise;
        if (token) {
          const headers = new AxiosHeaders(config.headers);
          headers.set('Authorization', `Bearer ${token}`);
          config.headers = headers;
        }
        return config;
      }

      // Get token (will refresh if needed)
      const token = await getAccessToken();
      if (token) {
        const headers = new AxiosHeaders(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
      }

      return config;
    } catch (error) {
      // Log but don't block the request
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error: any) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response: any) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Don't retry if no config or already retried
    if (!originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Only retry on 401 unauthorized
    if (error.response?.status === 401) {
      originalRequest._retry = true;

      // If not already refreshing, start refresh
      if (!refreshState.isRefreshing) {
        refreshState.isRefreshing = true;

        refreshState.refreshPromise = supabase.auth
          .refreshSession()
          .then(({ data, error }) => {
            if (error || !data.session) {
              processQueue(error || new Error('No session'), null);
              // Clear session on refresh failure
              supabase.auth.signOut();
              return null;
            }
            processQueue(null, data.session.access_token);
            return data.session.access_token;
          })
          .catch((err: any) => {
            processQueue(err, null);
            return null;
          })
          .finally(() => {
            refreshState.isRefreshing = false;
            refreshState.refreshPromise = null;
          });
      }

      // Wait for refresh to complete
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string | null) => {
            if (token) {
              const headers = new AxiosHeaders(originalRequest.headers);
              headers.set('Authorization', `Bearer ${token}`);
              originalRequest.headers = headers;
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          },
          reject,
        });
      });
    }

    return Promise.reject(error);
  },
);

export default api;
