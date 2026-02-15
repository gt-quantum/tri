import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updateSpaceSchema } from '@/lib/schemas/spaces'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('spaces')
      .select(`
        *,
        properties!inner(id, name, address, city, state),
        leases(
          id, tenant_id, lease_type, status,
          start_date, end_date, monthly_rent, annual_rent,
          rent_escalation
        )
      `)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw notFound('Space', id)

    // Enrich leases with tenant_name
    const leases = (data.leases as Record<string, unknown>[]) || []
    const tenantIds = [...new Set(leases.map((l) => l.tenant_id as string).filter(Boolean))]

    let tenantMap: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, company_name')
        .in('id', tenantIds)
        .eq('org_id', auth.orgId)
      tenantMap = Object.fromEntries((tenants || []).map((t) => [t.id, t.company_name]))
    }

    const enrichedLeases = leases.map((lease) => ({
      ...lease,
      tenant_name: tenantMap[lease.tenant_id as string] ?? null,
    }))

    const { properties, leases: _leases, ...space } = data as Record<string, unknown> & {
      properties: { id: string; name: string; address: string; city: string; state: string }
    }

    return successResponse(
      {
        ...space,
        property_name: properties?.name ?? null,
        property: properties,
        leases: enrichedLeases,
      },
      requestId
    )
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

    const body = await parseBody(request, updateSpaceSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: existing, error: fetchError } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Space', id)

    // If moving to a different property, validate it
    if (body.property_id) {
      const { data: property } = await supabase
        .from('properties')
        .select('id')
        .eq('id', body.property_id)
        .eq('org_id', auth.orgId)
        .is('deleted_at', null)
        .single()

      if (!property) {
        throw new ApiError('VALIDATION_ERROR', '1 validation error', 400, [
          { field: 'property_id', message: `Property '${body.property_id}' not found in your organization` },
        ])
      }
    }

    const { data: updated, error } = await supabase
      .from('spaces')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select('*, properties!inner(name)')
      .single()

    if (error) throw error

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'space',
      entityId: id,
      oldRecord: existing,
      newRecord: { ...existing, ...body },
      changedBy: auth.userId,
      changeSource,
    })

    const { properties, ...space } = updated as Record<string, unknown> & {
      properties: { name: string }
    }

    return successResponse({ ...space, property_name: properties?.name ?? null }, requestId)
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
      .from('spaces')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Space', id)

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('spaces')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    if (error) throw error

    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'space',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ id, deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
