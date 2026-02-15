import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updateUserSchema } from '@/lib/schemas/users'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('users')
      .select('id, org_id, email, full_name, role, created_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw notFound('User', id)

    return successResponse(data, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    requireRole(auth, 'admin')
    const { id } = await params

    const body = await parseBody(request, updateUserSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('User', id)

    const { data: updated, error } = await supabase
      .from('users')
      .update(body)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select('id, org_id, email, full_name, role, created_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        throw new ApiError('CONFLICT', `A user with email '${body.email}' already exists in this organization`, 409)
      }
      throw error
    }

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'user',
      entityId: id,
      oldRecord: existing,
      newRecord: { ...existing, ...body },
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    requireRole(auth, 'admin')
    const { id } = await params
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    // Prevent self-deletion
    if (id === auth.userId) {
      throw new ApiError('FORBIDDEN', 'You cannot delete your own account', 403)
    }

    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('User', id)

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('users')
      .update({ deleted_at: now })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    if (error) throw error

    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'user',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ id, deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
