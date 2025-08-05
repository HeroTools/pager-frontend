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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicApiRoute = PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
  const isWorkspaceRoute = pathname.split('/').filter(Boolean).length === 1 && pathname !== '/';

  if (isPublicApiRoute) {
    return supabaseResponse;
  }

  if (authError) {
    if (!isPublicRoute) {
      url.pathname = '/auth';
      url.searchParams.set('error', 'session_expired');
      return NextResponse.redirect(url);
    }
  }

  if (!user) {
    if (!isPublicRoute) {
      url.pathname = '/auth';
      url.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (user && isPublicRoute && pathname !== '/auth/callback') {
    if (url.searchParams.has('error') || url.searchParams.has('message')) {
      return supabaseResponse;
    }

    // Allow register route with invitation parameter for authenticated users
    if (pathname === '/register' && url.searchParams.has('invitation')) {
      return supabaseResponse;
    }

    // Redirect authenticated users to base route, which will handle workspace routing
    url.pathname = '/';
    url.searchParams.delete('redirectTo');
    return NextResponse.redirect(url);
  }

  if (isWorkspaceRoute) {
    const workspaceId = pathname.split('/')[1] || pathname.slice(2);

    if (!workspaceId) {
      // Redirect to base route instead of non-existent /workspaces
      // The base route component will handle proper workspace routing
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Add workspace ID to headers for server components
    const response = NextResponse.next({
      request: {
        headers: new Headers(request.headers),
      },
    });
    response.headers.set('x-workspace-id', workspaceId);

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });

    return response;
  }

  // Handle root path for authenticated users - let it through to the component
  if (user && pathname === '/') {
    return supabaseResponse;
  }

  return supabaseResponse;
}

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch (error) {
    console.error('Middleware error:', error);

    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('error', 'middleware_error');
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};