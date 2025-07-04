import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/auth', '/login', '/signup', '/forgot-password', '/join', '/register'];

// API routes that should be excluded from auth checks
const PUBLIC_API_ROUTES = ['/api/auth', '/api/public', '/api/webhooks'];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: DO NOT REMOVE auth.getUser()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Check route types
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));

  // Check if the path is a workspace ID (root level)
  const isWorkspaceRoute = pathname.split('/').filter(Boolean).length === 1 && pathname !== '/';

  // Skip auth checks for public API routes
  if (isPublicApiRoute) {
    return supabaseResponse;
  }

  console.log('Middleware - User:', user?.id, 'Path:', pathname);

  // Handle authentication errors
  if (authError) {
    console.error('Auth error in middleware:', authError);
    if (!isPublicRoute) {
      url.pathname = '/auth';
      url.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(url);
    }
  }

  // Handle unauthenticated users
  if (!user) {
    if (!isPublicRoute) {
      url.pathname = '/auth';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Handle authenticated users on public routes
  if (user && isPublicRoute && pathname !== '/auth/callback') {
    // Don't redirect if they're already on an auth page with error params
    if (url.searchParams.has('error') || url.searchParams.has('message')) {
      return supabaseResponse;
    }

    // Redirect authenticated users away from auth pages
    // Default to workspaces selection - your frontend will handle the smart routing
    url.pathname = '/${workspaceId}';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  // Handle workspace-specific routes
  if (isWorkspaceRoute) {
    const workspaceId = pathname.split('/')[1] || pathname.slice(2); // Handle both /workspaceId and workspaceId formats

    if (!workspaceId) {
      // Invalid workspace URL
      url.pathname = '/workspaces';
      return NextResponse.redirect(url);
    }

    // Note: We're not doing workspace access validation here because:
    // 1. It would require additional DB queries in middleware (performance impact)
    // 2. Your React Query cache and hooks handle this more efficiently
    // 3. The frontend can show proper error states if access is denied

    // Optional: Add workspace ID to headers for server components
    const response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });
    response.headers.set('x-workspace-id', workspaceId);

    // Copy over cookies from supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  }

  // Handle root path for authenticated users
  if (user && pathname === '/') {
    url.pathname = '/workspaces'; // Redirect to workspaces page instead of root
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Middleware error:', error);

    // Fallback: redirect to auth page on any middleware error
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('error', 'middleware_error');
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
