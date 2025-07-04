import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase/client';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
  statusCode?: number;
}

interface SupabaseAuthError {
  message: string;
  status?: number;
}

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
};

const setCookie = (name: string, value: string, days: number = 7): void => {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
};

const removeCookie = (name: string): void => {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

const handleLogout = (): void => {
  removeCookie('idToken');
  removeCookie('refreshToken');
  removeCookie('user-profile');

  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('user-profile');
    localStorage.removeItem('app-state');
  }

  if (typeof window !== 'undefined') {
    window.location.href = '/auth';
  }
};

const isAxiosError = (error: unknown): error is AxiosError<ApiErrorResponse> => {
  return axios.isAxiosError(error);
};

const isSupabaseAuthError = (error: unknown): error is SupabaseAuthError => {
  return typeof error === 'object' && error !== null && 'message' in error;
};

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8081',
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }

      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return Promise.reject(error);
    }
  },
  (error: unknown) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!isAxiosError(error)) {
      console.error('Non-axios error:', error);
      return Promise.reject(error);
    }

    const originalRequest = error.config as ExtendedAxiosRequestConfig;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const {
          data: { session },
          error: refreshError,
        } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.error('Token refresh failed:', {
            message: refreshError.message,
            status: refreshError.status,
          });
          throw refreshError;
        }

        if (session?.access_token) {
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return axiosInstance(originalRequest);
        }

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(new Error('No session available'));
      } catch (refreshError: unknown) {
        let errorMessage = 'Token refresh failed';
        let errorStatus: number | undefined;

        if (isSupabaseAuthError(refreshError)) {
          errorMessage = refreshError.message;
          errorStatus = refreshError.status;
        } else if (isAxiosError(refreshError)) {
          errorMessage = refreshError.response?.data?.message || refreshError.message;
          errorStatus = refreshError.response?.status;
        }

        console.error('Token refresh failed:', {
          message: errorMessage,
          status: errorStatus,
        });

        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 403) {
      const message =
        error.response.data?.message || 'You do not have permission to access this resource';
      console.error('Permission denied:', {
        message,
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Permission denied'));
    }

    if (error.response?.status === 404) {
      const message = error.response.data?.message || 'The requested resource was not found';
      console.error('Resource not found:', {
        message,
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Resource not found'));
    }

    if (error.response?.status && error.response.status >= 500) {
      const message = error.response.data?.message || 'An unexpected server error occurred';
      console.error('Server error:', {
        message,
        status: error.response.status,
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Server error'));
    }

    if (!error.response) {
      console.error('Network error:', {
        message: error.message || 'Network error occurred',
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Network error'));
    }

    return Promise.reject(error);
  },
);

export const authCookies = {
  setTokens: (idToken: string, refreshToken: string): void => {
    setCookie('idToken', idToken);
    setCookie('refreshToken', refreshToken);
  },

  clearTokens: (): void => {
    removeCookie('idToken');
    removeCookie('refreshToken');
  },

  getIdToken: (): string | null => getCookie('idToken'),

  getRefreshToken: (): string | null => getCookie('refreshToken'),

  logout: handleLogout,
} as const;
