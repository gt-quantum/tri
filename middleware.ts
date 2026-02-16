import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes that don't require authentication.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/callback',
]

/**
 * Routes that require auth but NOT an org (pre-onboarding).
 */
const PRE_ORG_ROUTES = ['/onboarding', '/api/v1/auth/create-org']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through without any auth check
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No user → redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the original URL so we can redirect back after login
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname)
    }
    return NextResponse.redirect(url)
  }

  // User is authenticated — check if they have an org
  const hasOrg = !!user.app_metadata?.org_id

  // Authenticated user on login/signup → redirect to dashboard or onboarding
  if (pathname === '/login' || pathname === '/signup') {
    const url = request.nextUrl.clone()
    url.pathname = hasOrg ? '/' : '/onboarding'
    return NextResponse.redirect(url)
  }

  // Pre-org routes: allow if authenticated (with or without org)
  if (PRE_ORG_ROUTES.some((route) => pathname.startsWith(route))) {
    // If user already has an org and tries to go to onboarding, redirect to dashboard
    if (hasOrg && pathname === '/onboarding') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // All other routes require both auth AND an org
  if (!hasOrg) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match app routes that need session management.
     * Excludes:
     * - _next/static, _next/image (static assets)
     * - favicon.ico and other static files
     * - /api/ routes (handle their own auth via getAuthContext())
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}
