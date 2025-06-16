/**
 * Axios Instance Configuration
 * 
 * This file exports a configured Axios instance that:
 * - Adds authentication tokens to requests
 * - Manages refresh tokens in cookies
 * - Handles specific error cases with appropriate responses
 * - Redirects to login on authentication failures
 * 
 * Error Handling:
 * - 401: Attempts token refresh, redirects to login if failed
 * - 403: Handles permission issues
 * - 404: Handles not found resources
 * - 500: Handles server errors
 * 
 * Usage:
 * ```typescript
 * import { axiosInstance } from '@/lib/axios';
 * 
 * // Make authenticated requests
 * const response = await axiosInstance.get('/api/protected-route');
 * ```
 */

import axios from "axios";
import { createClient } from "./supabase/client";

// Helper function to get cookie value
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift() || null;
  }
  return null;
};

// Helper function to set cookie
const setCookie = (name: string, value: string, days: number = 7): void => {
  if (typeof document === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;secure;samesite=strict`;
};

// Helper function to remove cookie
const removeCookie = (name: string): void => {
  if (typeof document === "undefined") return;

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
};

// Helper function to handle logout
const handleLogout = (): void => {
  // Clear all auth-related cookies
  removeCookie("idToken");
  removeCookie("refreshToken");
  removeCookie("user-profile");

  // Clear any other app-specific data
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("user-profile");
    localStorage.removeItem("app-state");
    // Add any other localStorage keys you want to clear
  }

  // Redirect to login page
  if (typeof window !== "undefined") {
    window.location.href = "/auth";
  }
};

// Create axios instance with default config
export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8081",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  async (config) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const supabase = createClient();
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();

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

        // If no session after refresh, redirect to login
        window.location.href = "/login";
        return Promise.reject(new Error("No session available"));
      } catch (refreshError: any) {
        console.error("Token refresh failed:", {
          message: refreshError.message,
          status: refreshError.response?.status,
          data: refreshError.response?.data,
        });

        // Redirect to login on refresh failure
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      console.error('Permission denied:', {
        message: error.response.data?.message || 'You do not have permission to access this resource',
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Permission denied'));
    }

    // Handle 404 Not Found errors
    if (error.response?.status === 404) {
      console.error('Resource not found:', {
        message: error.response.data?.message || 'The requested resource was not found',
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Resource not found'));
    }

    // Handle 500 Server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', {
        message: error.response.data?.message || 'An unexpected server error occurred',
        status: error.response.status,
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Server error'));
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error:', {
        message: error.message || 'Network error occurred',
        path: originalRequest.url,
      });
      return Promise.reject(new Error('Network error'));
    }

    return Promise.reject(error);
  }
);

// Export helper functions for managing auth cookies
export const authCookies = {
  setTokens: (idToken: string, refreshToken: string) => {
    setCookie("idToken", idToken);
    setCookie("refreshToken", refreshToken);
  },

  clearTokens: () => {
    removeCookie("idToken");
    removeCookie("refreshToken");
  },

  getIdToken: () => getCookie("idToken"),
  getRefreshToken: () => getCookie("refreshToken"),

  // Add logout function to the exported utilities
  logout: handleLogout,
};

