import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updatePropertySchema } from '@/lib/schemas/properties'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/properties/:id
 * Get a single property with related data.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('properties')
      .select(`
        *,
        portfolios!inner(id, name),
        spaces(id, name, floor, sqft, status, space_type),
        leases(
          id, tenant_id, space_id, lease_type, status,
          start_date, end_date, monthly_rent, annual_rent,
          rent_escalation
        )
      `)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !data) {
      throw notFound('Property', id)
    }

    // Look up tenant names for the leases
    const tenantIds = [
      ...new Set(
        ((data.leases as { tenant_id: string }[]) || []).map(
          (l) => l.tenant_id
        )
      ),
    ]

    let tenantMap: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, company_name')
        .in('id', tenantIds)
        .eq('org_id', auth.orgId)

      tenantMap = Object.fromEntries(
        (tenants || []).map((t) => [t.id, t.company_name])
      )
    }

    // Build space name map for lease enrichment
    const spaceMap: Record<string, string> = Object.fromEntries(
      ((data.spaces as { id: string; name: string }[]) || []).map((s) => [
        s.id,
        s.name,
      ])
    )

    // Enrich leases with tenant_name and space_name
    const enrichedLeases = ((data.leases as Record<string, unknown>[]) || []).map(
      (lease) => ({
        ...lease,
        tenant_name: tenantMap[(lease.tenant_id as string)] ?? null,
        space_name: lease.space_id
          ? spaceMap[(lease.space_id as string)] ?? null
          : null,
      })
    )

    // Filter out deleted spaces from response
    const activeSpaces = ((data.spaces as Record<string, unknown>[]) || []).filter(
      (s) => !s.deleted_at
    )

    const { portfolios, spaces: _spaces, leases: _leases, ...property } = data as Record<string, unknown> & {
      portfolios: { id: string; name: string }
    }

    return successResponse(
      {
        ...property,
        portfolio_name: portfolios?.name ?? null,
        spaces: activeSpaces,
        leases: enrichedLeases,
      },
      requestId
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * PATCH /api/v1/properties/:id
 * Update a property. Only send the fields you want to change.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')
    const { id } = await params

    const body = await parseBody(request, updatePropertySchema)
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Fetch current record for audit logging (old values)
    const { data: existing, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      throw notFound('Property', id)
    }

    // If updating portfolio_id, verify it belongs to this org
    if (body.portfolio_id) {
      const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', body.portfolio_id)
        .eq('org_id', auth.orgId)
        .is('deleted_at', null)
        .single()

      if (!portfolio) {
        throw new ApiError(
          'VALIDATION_ERROR',
          '1 validation error',
          400,
          [{ field: 'portfolio_id', message: `Portfolio '${body.portfolio_id}' not found in your organization` }]
        )
      }
    }

    // Apply update
    const { data: updated, error: updateError } = await supabase
      .from('properties')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select('*, portfolios!inner(name)')
      .single()

    if (updateError) throw updateError

    // Audit log — per-field entries
    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'property',
      entityId: id,
      oldRecord: existing,
      newRecord: { ...existing, ...body },
      changedBy: auth.userId,
      changeSource,
    })

    const { portfolios, ...property } = updated as Record<string, unknown> & {
      portfolios: { name: string }
    }

    return successResponse(
      { ...property, portfolio_name: portfolios?.name ?? null },
      requestId
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * DELETE /api/v1/properties/:id
 * Soft-delete a property (sets deleted_at).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')
    const { id } = await params

    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Verify the property exists and belongs to this org
    const { data: existing, error: fetchError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      throw notFound('Property', id)
    }

    // Soft delete
    const now = new Date().toISOString()
    const { error: deleteError } = await supabase
      .from('properties')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    if (deleteError) throw deleteError

    // Audit log
    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'property',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ id, deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
