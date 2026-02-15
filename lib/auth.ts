import { NextRequest } from 'next/server'
import { ApiError } from '@/lib/errors'

/**
 * Authenticated user context attached to every API request.
 */
export interface AuthContext {
  userId: string
  orgId: string
  role: 'admin' | 'manager' | 'viewer'
  email: string
  fullName: string
}

/**
 * Dev-mode user context.
 * Maps to Sarah Chen (admin) from seed data.
 * Replace with real Supabase Auth verification in production.
 */
const DEV_USER: AuthContext = {
  userId: 'b1000000-0000-0000-0000-000000000001',
  orgId: 'a1000000-0000-0000-0000-000000000001',
  role: 'admin',
  email: 'sarah.chen@apexcapital.com',
  fullName: 'Sarah Chen',
}

/**
 * Extract authenticated user from the request.
 *
 * Currently returns a hardcoded dev user. When Supabase Auth is
 * implemented, this will:
 * 1. Extract the JWT from the Authorization header
 * 2. Verify it with Supabase Auth
 * 3. Look up the user in the users table for org_id and role
 */
export function getAuthContext(_request: NextRequest): AuthContext {
  // TODO: Replace with real Supabase Auth verification
  return DEV_USER
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
