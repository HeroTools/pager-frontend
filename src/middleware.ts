"use server";

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isPublicPage = (path: string) => {
  // Define your public pages here
  return path.startsWith('/auth')
}

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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Add console logs for debugging environment variables and session
  console.log('Middleware SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('Middleware SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY);

  const { data: { session } } = await supabase.auth.getSession();
  console.log('Middleware Session:', session ? 'Present' : 'Not Present', session);

  // Protected routes - redirect to login if not authenticated
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // Redirect to dashboard if user is already logged in and tries to access auth pages
  if (session && request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*', '/'], // Broad matcher for debugging
};
