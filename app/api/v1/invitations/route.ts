import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createInvitationSchema } from '@/lib/schemas/auth'

/**
 * GET /api/v1/invitations
 * List all invitations for the current org.
 * Admins and managers can view.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')

    const { data, error, count } = await supabase
      .from('invitations')
      .select('*, users!invitations_invited_by_fkey(full_name, email)', {
        count: 'exact',
      })
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const enriched = (data || []).map((row) => {
      const { users, ...invitation } = row as Record<string, unknown> & {
        users: { full_name: string; email: string } | null
      }
      return {
        ...invitation,
        invited_by_name: users?.full_name ?? null,
        invited_by_email: users?.email ?? null,
        status: getInvitationStatus(invitation),
      }
    })

    return listResponse(enriched, count ?? 0, 100, 0, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * POST /api/v1/invitations
 * Create a new invitation. Admin only.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const body = await parseBody(request, createInvitationSchema)
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Check for existing active user with this email in the org
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('org_id', auth.orgId)
      .eq('email', body.email)
      .is('deleted_at', null)
      .single()

    if (existingUser) {
      throw new ApiError(
        'CONFLICT',
        `A user with email '${body.email}' already exists in your organization`,
        409
      )
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('org_id', auth.orgId)
      .eq('email', body.email)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      throw new ApiError(
        'CONFLICT',
        `A pending invitation already exists for '${body.email}'`,
        409
      )
    }

    // Generate a cryptographically random token
    const token = randomBytes(32).toString('hex')

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        org_id: auth.orgId,
        email: body.email,
        role: body.role,
        invited_by: auth.userId,
        token,
        expires_at: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Audit log
    await auditCreate({
      orgId: auth.orgId,
      entityType: 'invitation',
      entityId: invitation.id,
      newValues: { email: body.email, role: body.role },
      changedBy: auth.userId,
      changeSource,
    })

    // Build the invite URL
    const baseUrl =
      request.headers.get('origin') ||
      request.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
      ''
    const inviteUrl = `${baseUrl}/signup?token=${token}`

    return successResponse(
      {
        ...invitation,
        invite_url: inviteUrl,
      },
      requestId,
      201
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

function getInvitationStatus(inv: Record<string, unknown>): string {
  if (inv.accepted_at) return 'accepted'
  if (inv.revoked_at) return 'revoked'
  if (
    inv.expires_at &&
    new Date(inv.expires_at as string) < new Date()
  )
    return 'expired'
  return 'pending'
}
