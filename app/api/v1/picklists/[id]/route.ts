import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, parseChangeSource } from '@/lib/audit'
import { updatePicklistSchema } from '@/lib/schemas/picklists'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('picklist_definitions')
      .select('*')
      .eq('id', id)
      .or(`org_id.eq.${auth.orgId},org_id.is.null`)
      .single()

    if (error || !data) throw notFound('Picklist value', id)

    return successResponse(
      { ...data, scope: data.org_id === null ? 'system' : 'org' },
      requestId
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')
    const { id } = await params

    const body = await parseBody(request, updatePicklistSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    // Fetch existing — only allow updating org-specific picklists
    const { data: existing, error: fetchError } = await supabase
      .from('picklist_definitions')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !existing) {
      // Check if it's a system picklist
      const { data: systemRow } = await supabase
        .from('picklist_definitions')
        .select('id')
        .eq('id', id)
        .is('org_id', null)
        .single()

      if (systemRow) {
        throw new ApiError(
          'FORBIDDEN',
          'System-wide picklist values cannot be modified. Create an org-specific override instead.',
          403
        )
      }
      throw notFound('Picklist value', id)
    }

    const { data: updated, error } = await supabase
      .from('picklist_definitions')
      .update(body)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select()
      .single()

    if (error) throw error

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'picklist_definition',
      entityId: id,
      oldRecord: existing,
      newRecord: { ...existing, ...body },
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ ...updated, scope: 'org' }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
