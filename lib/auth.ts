import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ApiError } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase'

/**
 * Authenticated user context attached to every API request.
 * Requires the user to be associated with an organization.
 */
export interface AuthContext {
  userId: string
  orgId: string
  role: 'admin' | 'manager' | 'viewer'
  email: string
  fullName: string
}

/**
 * Minimal auth context for pre-org users (e.g., during onboarding).
 * The user is authenticated but may not have an org yet.
 */
export interface BasicAuthContext {
  userId: string
  email: string
  fullName: string
}

/**
 * Extract and verify authenticated user from the request.
 *
 * Checks two sources in order:
 * 1. Authorization: Bearer <token> header (API clients, MCP, desktop)
 * 2. Supabase session cookies (browser clients)
 *
 * Requires the user to have org_id and role in their JWT app_metadata.
 * Throws UNAUTHORIZED if no valid session, FORBIDDEN if no org.
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
  const user = await verifyUser(request)

  const orgId = user.app_metadata?.org_id
  const role = user.app_metadata?.role

  if (!orgId || !role) {
    throw new ApiError(
      'FORBIDDEN',
      'No organization associated with this account. Complete onboarding first.',
      403
    )
  }

  // Validate role is one of our known roles
  if (!['admin', 'manager', 'viewer'].includes(role)) {
    throw new ApiError('FORBIDDEN', 'Invalid role in user metadata', 403)
  }

  return {
    userId: user.id,
    orgId,
    role: role as 'admin' | 'manager' | 'viewer',
    email: user.email!,
    fullName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email!,
  }
}

/**
 * Extract and verify authenticated user without requiring an org.
 * Used for pre-org endpoints like POST /api/v1/auth/create-org.
 */
export async function getBasicAuthContext(
  request: NextRequest
): Promise<BasicAuthContext> {
  const user = await verifyUser(request)

  return {
    userId: user.id,
    email: user.email!,
    fullName:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email!,
  }
}

/**
 * Verify the user's session and return the Supabase User object.
 * Handles both Bearer token and cookie-based auth.
 */
async function verifyUser(request: NextRequest) {
  // 1. Try Bearer token (API clients, MCP, desktop apps)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const { data, error } = await getSupabase().auth.getUser(token)

    if (error || !data.user) {
      throw new ApiError('UNAUTHORIZED', 'Invalid or expired token', 401)
    }

    return data.user
  }

  // 2. Try session cookies (browser clients)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Route handlers can't set cookies through this path.
          // Session refresh happens in Next.js middleware.
        },
      },
    }
  )

  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    throw new ApiError('UNAUTHORIZED', 'Authentication required', 401)
  }

  return data.user
}

/**
 * Require a minimum role level. Throws FORBIDDEN if insufficient.
 *
 * Role hierarchy: admin > manager > viewer
 */
export function requireRole(
  auth: AuthContext,
  minimumRole: 'viewer' | 'manager' | 'admin'
): void {
  const hierarchy: Record<string, number> = {
    viewer: 1,
    manager: 2,
    admin: 3,
  }

  if (hierarchy[auth.role] < hierarchy[minimumRole]) {
    throw new ApiError(
      'FORBIDDEN',
      `This action requires ${minimumRole} role or higher. Your role: ${auth.role}`,
      403
    )
  }
}
