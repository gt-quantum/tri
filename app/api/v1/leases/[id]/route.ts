import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, notFound, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updateLeaseSchema } from '@/lib/schemas/leases'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('leases')
      .select(`
        *,
        tenants!inner(id, company_name, industry, credit_rating),
        properties!inner(id, name, address, city, state),
        spaces(id, name, floor, sqft)
      `)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (error || !data) throw notFound('Lease', id)

    const {
      tenants,
      properties,
      spaces,
      ...lease
    } = data as Record<string, unknown> & {
      tenants: { id: string; company_name: string; industry: string; credit_rating: string }
      properties: { id: string; name: string; address: string; city: string; state: string }
      spaces: { id: string; name: string; floor: string; sqft: number } | null
    }

    return successResponse(
      {
        ...lease,
        tenant_name: tenants?.company_name ?? null,
        tenant: tenants,
        property_name: properties?.name ?? null,
        property: properties,
        space_name: spaces?.name ?? null,
        space: spaces,
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

    const body = await parseBody(request, updateLeaseSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    // Fetch existing lease
    const { data: existing, error: fetchError } = await supabase
      .from('leases')
      .select('*')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Lease', id)

    // Determine the effective values for cross-entity validation.
    // If the update changes tenant/property/space, validate the new references.
    // If not changed, use the existing values.
    const effectiveTenantId = body.tenant_id ?? existing.tenant_id
    const effectivePropertyId = body.property_id ?? existing.property_id
    // For space_id: if explicitly included in body (even as null), use body value.
    // Otherwise keep existing.
    const effectiveSpaceId = 'space_id' in body ? body.space_id : existing.space_id

    // Only run cross-validation if any reference field changed
    const refsChanged =
      body.tenant_id !== undefined ||
      body.property_id !== undefined ||
      'space_id' in body

    if (refsChanged) {
      const errors: { field: string; message: string }[] = []

      // Run all validation queries in parallel
      const [tenantResult, propertyResult, spaceResult] = await Promise.all([
        body.tenant_id
          ? supabase.from('tenants').select('id').eq('id', body.tenant_id).eq('org_id', auth.orgId).is('deleted_at', null).single()
          : Promise.resolve({ data: { id: existing.tenant_id } }),
        body.property_id
          ? supabase.from('properties').select('id').eq('id', body.property_id).eq('org_id', auth.orgId).is('deleted_at', null).single()
          : Promise.resolve({ data: { id: existing.property_id } }),
        effectiveSpaceId
          ? supabase.from('spaces').select('id, property_id').eq('id', effectiveSpaceId).eq('org_id', auth.orgId).is('deleted_at', null).single()
          : Promise.resolve({ data: null }),
      ])

      if (body.tenant_id && !tenantResult.data) {
        errors.push({
          field: 'tenant_id',
          message: `Tenant '${body.tenant_id}' not found in your organization`,
        })
      }

      if (body.property_id && !propertyResult.data) {
        errors.push({
          field: 'property_id',
          message: `Property '${body.property_id}' not found in your organization`,
        })
      }

      if (effectiveSpaceId) {
        const space = spaceResult.data as { id: string; property_id: string } | null
        if (!space) {
          errors.push({
            field: 'space_id',
            message: `Space '${effectiveSpaceId}' not found in your organization`,
          })
        } else if (space.property_id !== effectivePropertyId) {
          errors.push({
            field: 'space_id',
            message: `Space '${effectiveSpaceId}' belongs to a different property (expected property '${effectivePropertyId}')`,
          })
        }
      }

      if (errors.length > 0) {
        throw new ApiError(
          'VALIDATION_ERROR',
          `${errors.length} validation error${errors.length === 1 ? '' : 's'}`,
          400,
          errors
        )
      }
    }

    // Validate date consistency if both dates are being set
    const effectiveStart = body.start_date ?? existing.start_date
    const effectiveEnd = body.end_date ?? existing.end_date
    if (effectiveEnd < effectiveStart) {
      throw new ApiError('VALIDATION_ERROR', '1 validation error', 400, [
        { field: 'end_date', message: 'end_date must be on or after start_date' },
      ])
    }

    const { data: updated, error } = await supabase
      .from('leases')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select('*, tenants!inner(company_name), properties!inner(name), spaces(name)')
      .single()

    if (error) throw error

    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'lease',
      entityId: id,
      oldRecord: existing,
      newRecord: { ...existing, ...body },
      changedBy: auth.userId,
      changeSource,
    })

    const { tenants, properties, spaces, ...lease } = updated as Record<string, unknown> & {
      tenants: { company_name: string }
      properties: { name: string }
      spaces: { name: string } | null
    }

    return successResponse(
      {
        ...lease,
        tenant_name: tenants?.company_name ?? null,
        property_name: properties?.name ?? null,
        space_name: spaces?.name ?? null,
      },
      requestId
    )
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
      .from('leases')
      .select('id')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) throw notFound('Lease', id)

    const now = new Date().toISOString()
    const { error } = await supabase
      .from('leases')
      .update({ deleted_at: now, updated_at: now })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    if (error) throw error

    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'lease',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ id, deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
