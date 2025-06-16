"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase Client Configuration
 * 
 * This file exports a function to create a Supabase client for server-side usage.
 * The client is configured with:
 * - Server-side cookie management
 * - Secure session handling
 * - Error handling for server components
 * 
 * Usage:
 * ```typescript
 * const supabase = await createClient();
 * const { data: { session } } = await supabase.auth.getSession();
 * ```
 */

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors in server components
            console.error('Error setting cookie:', error);
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors in server components
            console.error('Error removing cookie:', error);
          }
        },
      },
    }
  );
};
