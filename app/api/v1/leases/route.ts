import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createLeaseSchema, listLeasesQuery } from '@/lib/schemas/leases'

/**
 * Validate that tenant, property, and space all belong to the correct org
 * and that the space belongs to the referenced property.
 * Returns resolved names for response enrichment.
 */
async function validateLeaseReferences(
  orgId: string,
  tenantId: string,
  propertyId: string,
  spaceId: string | null | undefined
): Promise<{ tenantName: string; propertyName: string; spaceName: string | null }> {
  const errors: { field: string; message: string }[] = []

  // Validate tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, company_name')
    .eq('id', tenantId)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .single()

  if (!tenant) {
    errors.push({
      field: 'tenant_id',
      message: `Tenant '${tenantId}' not found in your organization`,
    })
  }

  // Validate property
  const { data: property } = await supabase
    .from('properties')
    .select('id, name')
    .eq('id', propertyId)
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .single()

  if (!property) {
    errors.push({
      field: 'property_id',
      message: `Property '${propertyId}' not found in your organization`,
    })
  }

  // Validate space (if provided) — must belong to the referenced property
  let spaceName: string | null = null
  if (spaceId) {
    const { data: space } = await supabase
      .from('spaces')
      .select('id, name, property_id')
      .eq('id', spaceId)
      .eq('org_id', orgId)
      .is('deleted_at', null)
      .single()

    if (!space) {
      errors.push({
        field: 'space_id',
        message: `Space '${spaceId}' not found in your organization`,
      })
    } else if (space.property_id !== propertyId) {
      errors.push({
        field: 'space_id',
        message: `Space '${spaceId}' belongs to a different property (expected property '${propertyId}')`,
      })
    } else {
      spaceName = space.name
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

  return {
    tenantName: tenant!.company_name,
    propertyName: property!.name,
    spaceName,
  }
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listLeasesQuery)

    let query = supabase
      .from('leases')
      .select(
        '*, tenants!inner(company_name), properties!inner(name), spaces(name)',
        { count: 'exact' }
      )
      .eq('org_id', auth.orgId)

    if (params.include_deleted !== 'true') {
      query = query.is('deleted_at', null)
    }
    if (params.tenant_id) {
      query = query.eq('tenant_id', params.tenant_id)
    }
    if (params.property_id) {
      query = query.eq('property_id', params.property_id)
    }
    if (params.space_id) {
      query = query.eq('space_id', params.space_id)
    }
    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.lease_type) {
      query = query.eq('lease_type', params.lease_type)
    }

    query = query.order(params.sort, { ascending: params.order === 'asc' })
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const enriched = (data || []).map((row) => {
      const {
        tenants,
        properties,
        spaces,
        ...lease
      } = row as Record<string, unknown> & {
        tenants: { company_name: string }
        properties: { name: string }
        spaces: { name: string } | null
      }
      return {
        ...lease,
        tenant_name: tenants?.company_name ?? null,
        property_name: properties?.name ?? null,
        space_name: spaces?.name ?? null,
      }
    })

    return listResponse(enriched, count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    requireRole(auth, 'manager')

    const body = await parseBody(request, createLeaseSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    // Cross-entity validation: tenant, property, and space
    const resolved = await validateLeaseReferences(
      auth.orgId,
      body.tenant_id,
      body.property_id,
      body.space_id
    )

    // Auto-calculate annual_rent if not provided
    const annual_rent = body.annual_rent ?? body.monthly_rent * 12

    const now = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('leases')
      .insert({
        ...body,
        annual_rent,
        org_id: auth.orgId,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw error

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'lease',
      entityId: created.id,
      newValues: body,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(
      {
        ...created,
        tenant_name: resolved.tenantName,
        property_name: resolved.propertyName,
        space_name: resolved.spaceName,
      },
      requestId,
      201
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
