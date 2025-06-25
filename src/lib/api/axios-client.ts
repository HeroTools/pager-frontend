// lib/api/axios-client.ts
import axios, {
  AxiosInstance,
  AxiosError,
  AxiosHeaders,
  InternalAxiosRequestConfig,
} from "axios";
import { supabase } from "@/lib/supabase/client";

// ——————— CONFIG ———————
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL!;
const REQUEST_TIMEOUT = 10_000; // ms

// ——————— REFRESH QUEUE ———————
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const subscribers: Array<(token: string | null) => void> = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  subscribers.push(cb);
}

function onRefreshed(token: string | null) {
  subscribers.forEach((cb) => cb(token));
  subscribers.length = 0;
}

// ——————— TOKEN REFRESHER ———————
async function refreshAccessToken(): Promise<string | null> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("[Auth] getSession failed", sessionError);
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const fiveMin = 5 * 60;
  if (session.expires_at && session.expires_at - now < fiveMin) {
    const { data: newSession, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError || !newSession.session) {
      console.error("[Auth] refreshSession failed", refreshError);
      return null;
    }
    return newSession.session.access_token;
  }

  return session.access_token;
}

// ——————— AXIOS INSTANCE ———————
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

// ——————— REQUEST INTERCEPTOR ———————
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wrap existing headers in AxiosHeaders so we can mutate them
    const headers = new AxiosHeaders(config.headers);

    // Kick off (or reuse) token refresh
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().then((token) => {
        isRefreshing = false;
        onRefreshed(token);
        return token;
      });
    }

    // Wait for refresh to complete (or return existing token)
    const token = await refreshPromise;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Assign the AxiosHeaders instance back—TS sees all methods present
    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error)
);

// ——————— RESPONSE INTERCEPTOR ———————
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken().then((token) => {
          isRefreshing = false;
          onRefreshed(token);
          return token;
        });
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (newToken) {
            // Build a new AxiosHeaders for the retry
            const retryHeaders = new AxiosHeaders(originalRequest.headers);
            retryHeaders.set("Authorization", `Bearer ${newToken}`);
            originalRequest.headers = retryHeaders;
            resolve(api(originalRequest));
          } else {
            reject(error);
          }
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
