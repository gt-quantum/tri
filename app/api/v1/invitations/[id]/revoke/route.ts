import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'

/**
 * PATCH /api/v1/invitations/:id/revoke
 * Revoke a pending invitation. Admin only.
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
        'This invitation has already been revoked',
        409
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
