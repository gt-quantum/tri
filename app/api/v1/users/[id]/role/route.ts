import { NextRequest } from 'next/server'
import { getSupabase, supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, parseChangeSource } from '@/lib/audit'
import { updateRoleSchema } from '@/lib/schemas/auth'

/**
 * PATCH /api/v1/users/:id/role
 * Change a user's role. Admin only.
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
    const body = await parseBody(request, updateRoleSchema)
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Can't change your own role
    if (id === auth.userId) {
      throw new ApiError(
        'FORBIDDEN',
        'You cannot change your own role. Ask another admin.',
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

    // If demoting from admin, check they're not the last admin
    if (targetUser.role === 'admin' && body.role !== 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', auth.orgId)
        .eq('role', 'admin')
        .is('deleted_at', null)

      if ((count ?? 0) <= 1) {
        throw new ApiError(
          'FORBIDDEN',
          'Cannot demote the last admin. Promote another user to admin first.',
          403
        )
      }
    }

    // Update role in public.users
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({ role: body.role })
      .eq('id', id)
      .select('id, org_id, email, full_name, role, created_at')
      .single()

    if (updateError) throw updateError

    // Update role in auth.users app_metadata
    await getSupabase().auth.admin.updateUserById(id, {
      app_metadata: { role: body.role },
    })

    // Audit log
    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'user',
      entityId: id,
      oldRecord: { role: targetUser.role },
      newRecord: { role: body.role },
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
