import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isPublicPage = (path: string) => {
  return path.startsWith('/auth')
}

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req: request, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!isPublicPage(request.nextUrl.pathname) && !session) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  if (isPublicPage(request.nextUrl.pathname) && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
