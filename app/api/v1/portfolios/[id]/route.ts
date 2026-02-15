import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updatePortfolioSchema } from '@/lib/schemas/portfolios'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const { id } = await params

    // Portfolio with summary of its properties
    const { data, error } = await supabase
      .from('portfolios')
      .select('*, properties(id, name, city, state, property_type, total_sqft, current_value)')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw notFound('Portfolio', id)

    // Filter out deleted properties
    const properties = ((data.properties as Record<string, unknown>[]) || []).filter(
      (p) => !p.deleted_at
    )

    const { properties: _props, ...portfolio } = data
    return successResponse({ ...portfolio, properties }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    requireRole(auth, 'manager')
    const { id } = await params

    const body = await parseBody(request, updatePortfolioSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: existing, error: fetchError } = await supabase
      .from('portfolios')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Portfolio', id)

    const { data: updated, error } = await supabase
      .from('portfolios')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select()
      .single()

    if (error) throw error

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'portfolio',
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

    const { data: existing, error: fetchError } = await supabase
      .from('portfolios')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Portfolio', id)

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('portfolios')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    if (error) throw error

    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'portfolio',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ id, deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
