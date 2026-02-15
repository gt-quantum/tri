import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, parseChangeSource } from '@/lib/audit'
import { updateCustomFieldSchema } from '@/lib/schemas/custom-fields'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !data) throw notFound('Custom field definition', id)

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

    const body = await parseBody(request, updateCustomFieldSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: existing, error: fetchError } = await supabase
      .from('custom_field_definitions')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !existing) throw notFound('Custom field definition', id)

    const { data: updated, error } = await supabase
      .from('custom_field_definitions')
      .update(body)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select()
      .single()

    if (error) throw error

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'custom_field_definition',
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
