import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createSpaceSchema, listSpacesQuery } from '@/lib/schemas/spaces'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listSpacesQuery)

    let query = supabase
      .from('spaces')
      .select('*, properties!inner(name)', { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (params.include_deleted !== 'true') {
      query = query.is('deleted_at', null)
    }
    if (params.property_id) {
      query = query.eq('property_id', params.property_id)
    }
    if (params.status) {
      query = query.eq('status', params.status)
    }
    if (params.space_type) {
      query = query.eq('space_type', params.space_type)
    }

    query = query.order(params.sort, { ascending: params.order === 'asc' })
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const enriched = (data || []).map((row) => {
      const { properties, ...space } = row as Record<string, unknown> & {
        properties: { name: string }
      }
      return { ...space, property_name: properties?.name ?? null }
    })

    return listResponse(enriched, count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')

    const body = await parseBody(request, createSpaceSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    // Validate property belongs to this org
    const { data: property } = await supabase
      .from('properties')
      .select('id, name')
      .eq('id', body.property_id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (!property) {
      throw new ApiError('VALIDATION_ERROR', '1 validation error', 400, [
        { field: 'property_id', message: `Property '${body.property_id}' not found in your organization` },
      ])
    }

    const now = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('spaces')
      .insert({ ...body, org_id: auth.orgId, created_at: now, updated_at: now })
      .select('*, properties!inner(name)')
      .single()

    if (error) throw error

    const { properties, ...space } = created as Record<string, unknown> & {
      properties: { name: string }
    }

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'space',
      entityId: created.id,
      newValues: body,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ ...space, property_name: properties?.name ?? null }, requestId, 201)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
