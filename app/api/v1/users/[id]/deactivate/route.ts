import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { auditSoftDelete, parseChangeSource } from '@/lib/audit'

/**
 * POST /api/v1/users/:id/deactivate
 * Soft-delete a user. Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const { id } = await params
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Can't deactivate yourself
    if (id === auth.userId) {
      throw new ApiError(
        'FORBIDDEN',
        'You cannot deactivate your own account.',
        403
      )
    }

    // Fetch the target user
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('id, org_id, email, full_name, role, created_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !targetUser) {
      throw new ApiError(
        'NOT_FOUND',
        `User '${id}' not found in your organization`,
        404
      )
    }

    // Can't deactivate the last admin
    if (targetUser.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('role', 'admin')
        .is('deleted_at', null)

      if ((count ?? 0) <= 1) {
        throw new ApiError(
          'FORBIDDEN',
          'Cannot deactivate the last admin.',
          403
        )
      }
    }

    // Soft delete
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, org_id, email, full_name, role, created_at, deleted_at')
      .single()

    if (updateError) throw updateError

    // Audit log
    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'user',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
