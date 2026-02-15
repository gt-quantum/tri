import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateRequestId, successResponse } from '@/lib/response'
import { errorResponse, ApiError } from '@/lib/errors'

/**
 * GET /api/v1/invitations/lookup?token=xxx
 * Public endpoint (no auth required) — looks up invitation details for the signup page.
 * Only returns minimal info: org name, role, and email.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      throw new ApiError('VALIDATION_ERROR', 'Token is required', 400)
    }

    const { data: invitation, error } = await supabase
      .from('invitations')
      .select('email, role, expires_at, accepted_at, revoked_at, org_id, organizations(name)')
      .eq('token', token)
      .single()

    if (error || !invitation) {
      throw new ApiError(
        'NOT_FOUND',
        'This invitation link is not valid.',
        404
      )
    }

    if (invitation.accepted_at) {
      throw new ApiError(
        'CONFLICT',
        'This invitation has already been accepted.',
        409
      )
    }

    if (invitation.revoked_at) {
      throw new ApiError(
        'CONFLICT',
        'This invitation is no longer valid. Contact your organization admin.',
        409
      )
    }

    if (new Date(invitation.expires_at) < new Date()) {
      throw new ApiError(
        'CONFLICT',
        'This invitation has expired. Contact your organization admin.',
        409
      )
    }

    const org = invitation.organizations as unknown as { name: string } | null

    return successResponse(
      {
        email: invitation.email,
        role: invitation.role,
        org_name: org?.name ?? 'Unknown',
      },
      requestId
    )
  } catch (err) {
    // Don't leak internal errors on public endpoint
    if (err instanceof ApiError) {
      return errorResponse(err, requestId)
    }
    return NextResponse.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: 'This invitation link is not valid.',
          request_id: requestId,
        },
      },
      { status: 404 }
    )
  }
}
