import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseChangeSource } from '@/lib/audit'

/**
 * POST /api/v1/users/:id/reactivate
 * Restore a soft-deleted user. Admin only.
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

    // Fetch the target user (must be deactivated)
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('id, org_id, email, full_name, role, created_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .not('deleted_at', 'is', null)
      .single()

    if (error || !targetUser) {
      throw new ApiError(
        'NOT_FOUND',
        `Deactivated user '${id}' not found in your organization`,
        404
      )
    }

    // Clear deleted_at
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ deleted_at: null })
      .eq('id', id)
      .select('id, org_id, email, full_name, role, created_at')
      .single()

    if (updateError) throw updateError

    // Audit log (restore action)
    await supabase.from('audit_log').insert({
      org_id: auth.orgId,
      entity_type: 'user',
      entity_id: id,
      action: 'restore',
      field_name: null,
      old_value: null,
      new_value: null,
      changed_by: auth.userId,
      changed_at: new Date().toISOString(),
      change_source: changeSource,
    })

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
