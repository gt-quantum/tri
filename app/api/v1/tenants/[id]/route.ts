import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updateTenantSchema } from '@/lib/schemas/tenants'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('tenants')
      .select(`
        *,
        leases(
          id, property_id, space_id, lease_type, status,
          start_date, end_date, monthly_rent, annual_rent,
          rent_escalation
        )
      `)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw notFound('Tenant', id)

    // Resolve parent tenant name
    let parentTenantName: string | null = null
    if (data.parent_tenant_id) {
      const { data: parent } = await supabase
        .from('tenants')
        .select('company_name')
        .eq('id', data.parent_tenant_id)
        .eq('org_id', auth.orgId)
        .single()
      parentTenantName = parent?.company_name ?? null
    }

    // Resolve subsidiaries
    const { data: subsidiaries } = await supabase
      .from('tenants')
      .select('id, company_name')
      .eq('parent_tenant_id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)

    // Enrich leases with property_name and space_name
    const leases = (data.leases as Record<string, unknown>[]) || []
    const propertyIds = [...new Set(leases.map((l) => l.property_id as string).filter(Boolean))]
    const spaceIds = [...new Set(leases.map((l) => l.space_id as string).filter(Boolean))]

    let propertyMap: Record<string, string> = {}
    if (propertyIds.length > 0) {
      const { data: props } = await supabase
        .from('properties')
        .select('id, name')
        .in('id', propertyIds)
        .eq('org_id', auth.orgId)
      propertyMap = Object.fromEntries((props || []).map((p) => [p.id, p.name]))
    }

    let spaceMap: Record<string, string> = {}
    if (spaceIds.length > 0) {
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id, name')
        .in('id', spaceIds)
        .eq('org_id', auth.orgId)
      spaceMap = Object.fromEntries((spaces || []).map((s) => [s.id, s.name]))
    }

    const enrichedLeases = leases.map((lease) => ({
      ...lease,
      property_name: propertyMap[lease.property_id as string] ?? null,
      space_name: lease.space_id ? spaceMap[lease.space_id as string] ?? null : null,
    }))

    const { leases: _leases, ...tenant } = data

    return successResponse(
      {
        ...tenant,
        parent_tenant_name: parentTenantName,
        subsidiaries: subsidiaries || [],
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
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')
    const { id } = await params

    const body = await parseBody(request, updateTenantSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: existing, error: fetchError } = await supabase
      .from('tenants')
      .select('id, org_id, company_name, industry, website, primary_contact_name, primary_contact_email, primary_contact_phone, credit_rating, parent_tenant_id, metadata, created_at, updated_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Tenant', id)

    // Validate parent_tenant_id if being changed
    if (body.parent_tenant_id) {
      // Prevent self-reference
      if (body.parent_tenant_id === id) {
        throw new ApiError('VALIDATION_ERROR', '1 validation error', 400, [
          { field: 'parent_tenant_id', message: 'A tenant cannot be its own parent' },
        ])
      }

      const { data: parent } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', body.parent_tenant_id)
        .eq('org_id', auth.orgId)
        .is('deleted_at', null)
        .single()

      if (!parent) {
        throw new ApiError('VALIDATION_ERROR', '1 validation error', 400, [
          { field: 'parent_tenant_id', message: `Parent tenant '${body.parent_tenant_id}' not found in your organization` },
        ])
      }
    }

    const { data: updated, error } = await supabase
      .from('tenants')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select('id, org_id, company_name, industry, website, primary_contact_name, primary_contact_email, primary_contact_phone, credit_rating, parent_tenant_id, metadata, created_at, updated_at')
      .single()

    if (error) throw error

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'tenant',
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
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')
    const { id } = await params
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: existing, error: fetchError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Tenant', id)

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('tenants')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    if (error) throw error

    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'tenant',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ id, deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
