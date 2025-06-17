import { createClient } from "@/lib/supabase/client";

// Base API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://your-api-gateway-url.com";

/**
 * HTTP client with automatic token management and error handling
 */
export class AuthenticatedHttpClient {
  private supabase = createClient();

  /**
   * Get current access token from Supabase session
   */
  private async getAccessToken(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Refresh session if needed and get fresh token
   */
  private async refreshTokenIfNeeded(): Promise<string | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    if (!session) return null;

    // Check if token is close to expiring (within 5 minutes)
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;

    if (expiresAt && expiresAt - now < fiveMinutes) {
      const { data: refreshedSession, error } =
        await this.supabase.auth.refreshSession();
      if (error) throw error;
      return refreshedSession.session?.access_token || null;
    }

    return session.access_token;
  }

  /**
   * Make authenticated request to Lambda
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.refreshTokenIfNeeded();

    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Handle 401 - token might be invalid, try to refresh once
    if (response.status === 401 && token) {
      const { data: refreshedSession, error } =
        await this.supabase.auth.refreshSession();
      if (!error && refreshedSession.session?.access_token) {
        // Retry with fresh token
        const retryConfig: RequestInit = {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${refreshedSession.session.access_token}`,
            ...options.headers,
          },
        };

        const retryResponse = await fetch(
          `${API_BASE_URL}${endpoint}`,
          retryConfig
        );
        if (!retryResponse.ok) {
          throw new Error(
            `HTTP ${retryResponse.status}: ${retryResponse.statusText}`
          );
        }
        return retryResponse.json();
      }
    }

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Make unauthenticated request (for login, signup, etc.)
   */
  private async makePublicRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  // Public HTTP methods for authenticated requests
  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" });
  }

  // Public HTTP methods for unauthenticated requests
  async getPublic<T>(endpoint: string): Promise<T> {
    return this.makePublicRequest<T>(endpoint, { method: "GET" });
  }

  async postPublic<T>(endpoint: string, data?: any): Promise<T> {
    return this.makePublicRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Create and export singleton instance
export const httpClient = new AuthenticatedHttpClient();

// Export the class for cases where you need multiple instances
export default AuthenticatedHttpClient;
