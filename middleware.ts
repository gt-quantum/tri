import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Routes that don't require authentication.
 */
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/callback',
  '/api/v1/health',
  '/api/v1/docs',
  '/api/v1/openapi.json',
]

/**
 * Routes that require auth but NOT an org (pre-onboarding).
 */
const PRE_ORG_ROUTES = ['/onboarding', '/api/v1/auth/create-org']

export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl

  // Allow public routes and static assets through
  if (
    PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return supabaseResponse
  }

  // API routes handle their own auth via getAuthContext()
  // (returns 401/403 instead of redirecting)
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

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
     * Match all routes except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
