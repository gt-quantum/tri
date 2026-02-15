import { NextRequest } from 'next/server'
import { randomBytes } from 'crypto'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'

/**
 * PATCH /api/v1/invitations/:id/resend
 * Resend an invitation with a new token and extended expiry.
 * Admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const { id } = await params

    // Fetch the invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !invitation) {
      throw new ApiError(
        'NOT_FOUND',
        `Invitation '${id}' not found`,
        404
      )
    }

    // Must be pending (not accepted or revoked)
    if (invitation.accepted_at) {
      throw new ApiError(
        'CONFLICT',
        'This invitation has already been accepted',
        409
      )
    }

    if (invitation.revoked_at) {
      throw new ApiError(
        'CONFLICT',
        'This invitation has been revoked. Create a new invitation instead.',
        409
      )
    }

    // Generate new token and reset expiry
    const newToken = randomBytes(32).toString('hex')
    const newExpiry = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: updated, error: updateError } = await supabase
      .from('invitations')
      .update({
        token: newToken,
        expires_at: newExpiry,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    const baseUrl =
      request.headers.get('origin') ||
      request.headers.get('referer')?.replace(/\/[^/]*$/, '') ||
      ''

    return successResponse(
      {
        ...updated,
        invite_url: `${baseUrl}/signup?token=${newToken}`,
      },
      requestId
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
