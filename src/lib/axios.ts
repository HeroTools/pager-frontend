import axios from "axios";

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

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Get the idToken from cookies
    const idToken = getCookie("idToken");
    if (idToken) {
      config.headers.Authorization = `Bearer ${idToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get the refresh token from cookies
        const refreshToken = getCookie("refreshToken");

        if (!refreshToken) {
          console.warn("No refresh token found, logging out");
          handleLogout();
          return Promise.reject(new Error("No refresh token available"));
        }

        console.log("Attempting to refresh token...");

        // Call refresh token endpoint
        const response = await axiosInstance.post("/auth/refresh", {
          refresh_token: refreshToken,
        });

        // Check if refresh was successful
        if (response.data.success && response.data.data?.session) {
          const { session } = response.data.data;

          console.log("Token refresh successful");

          // Update tokens in cookies
          setCookie("idToken", session.access_token);
          setCookie("refreshToken", session.refresh_token);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return axiosInstance(originalRequest);
        } else {
          // Refresh endpoint returned success: false or no session
          console.error(
            "Refresh endpoint returned invalid response:",
            response.data
          );
          handleLogout();
          return Promise.reject(new Error("Invalid refresh response"));
        }
      } catch (refreshError: any) {
        // Log the specific error for debugging
        console.error("Token refresh failed:", {
          message: refreshError.message,
          status: refreshError.response?.status,
          data: refreshError.response?.data,
        });

        // Handle specific error cases
        if (refreshError.response?.status === 401) {
          console.warn("Refresh token invalid or expired, logging out");
        } else if (refreshError.response?.status >= 500) {
          console.error("Server error during refresh, logging out");
        } else {
          console.error("Unknown refresh error, logging out");
        }

        // Always log out on refresh failure
        handleLogout();
        return Promise.reject(refreshError);
      }
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
