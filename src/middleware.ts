"use server";

/**
 * Authentication Middleware
 * 
 * This middleware handles authentication and route protection using Supabase Auth.
 * It runs on the edge and is responsible for:
 * 1. Managing authentication state
 * 2. Protecting routes that require authentication
 * 3. Redirecting authenticated users away from auth pages
 * 4. Handling session cookies
 * 
 * The middleware uses Supabase's SSR client to:
 * - Get the current session
 * - Manage cookies for session persistence
 * - Handle auth state changes
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware for Authentication and Route Protection
 * 
 * This middleware:
 * - Initializes Supabase client with cookie handling
 * - Manages session state
 * - Protects routes based on authentication status
 * - Handles redirects for authenticated/unauthenticated users
 * 
 * Protected Routes:
 * - /dashboard
 * - /auth
 * - /workspace
 * - /join
 */

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/workspace", "/join"];
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // If accessing a protected route without a session, redirect to login
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If accessing login/register with a session, redirect to dashboard
  if (session && (request.nextUrl.pathname === "/auth" || request.nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
