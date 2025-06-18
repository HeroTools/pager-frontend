/**
 * Supabase Client Configuration
 *
 * This file exports a function to create a Supabase client for browser-side usage.
 * The client is configured to use cookies for both session and refresh token storage,
 * which is the recommended approach for Next.js applications.
 *
 * Features:
 * - Session persistence in cookies
 * - Refresh token storage in cookies
 * - Automatic token refresh
 * - Secure cookie settings
 *
 * Usage:
 * ```typescript
 * const supabase = createClient();
 * const { data: { session } } = await supabase.auth.getSession();
 * ```
 */

import { createBrowserClient } from "@supabase/ssr";

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
            if (
              typeof window === "undefined" ||
              typeof document === "undefined"
            )
              return null;
            const cookies = document.cookie.split(";");
            const cookie = cookies.find((c) => c.trim().startsWith(`${key}=`));
            return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
          },
          setItem: (key, value) => {
            if (typeof window === "undefined") return;
            // Set secure cookie with appropriate settings
            document.cookie = `${key}=${encodeURIComponent(
              value
            )}; path=/; secure; samesite=lax; max-age=2592000`; // 30 days
          },
          removeItem: (key) => {
            if (typeof window === "undefined") return;
            document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=lax`;
          },
        },
      },
      global: {
        headers: {
          "X-Client-Info": "unowned-frontend",
        },
      },
    }
  );
};
