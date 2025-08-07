import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/auth', '/login', '/signup', '/forgot-password', '/join', '/register'];
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

  // Attempt to get user, but handle errors gracefully
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) {
      user = data.user;
    }
  } catch (error) {
    // Log but don't fail the request
    console.error('Middleware auth check error:', error);
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
  const isWorkspaceRoute = pathname.split('/').filter(Boolean).length === 1 && pathname !== '/';

  // Always allow public API routes
  if (isPublicApiRoute) {
    return supabaseResponse;
  }

  // Redirect to auth if no user and trying to access protected route
  if (!user && !isPublicRoute) {
    url.pathname = '/auth';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicRoute && pathname !== '/auth/callback') {
    // Allow certain conditions
    if (url.searchParams.has('error') || url.searchParams.has('message')) {
      return supabaseResponse;
    }

    // Allow register route with invitation for authenticated users
    if (pathname === '/register' && url.searchParams.has('invitation')) {
      return supabaseResponse;
    }

    // Redirect to home
    url.pathname = '/';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  // Handle workspace routes
  if (isWorkspaceRoute) {
    const workspaceId = pathname.split('/')[1] || pathname.slice(2);

    if (!workspaceId) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Add workspace ID to headers
    const response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });
    response.headers.set('x-workspace-id', workspaceId);

    // Copy cookies from supabase response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Middleware error:', error);

    // For API routes, return error response
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // For page routes, redirect to auth with error
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('error', 'middleware_error');
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
