import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createPropertySchema, listPropertiesQuery } from '@/lib/schemas/properties'

/**
 * GET /api/v1/properties
 * List properties with filtering, sorting, and pagination.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listPropertiesQuery)

    let query = supabase
      .from('properties')
      .select('*, portfolios!inner(name)', { count: 'exact' })
      .eq('org_id', auth.orgId)

    // Soft-delete filter
    if (params.include_deleted !== 'true') {
      query = query.is('deleted_at', null)
    }

    // Filters
    if (params.portfolio_id) {
      query = query.eq('portfolio_id', params.portfolio_id)
    }
    if (params.property_type) {
      query = query.eq('property_type', params.property_type)
    }
    if (params.city) {
      query = query.ilike('city', `%${params.city}%`)
    }
    if (params.state) {
      query = query.ilike('state', `%${params.state}%`)
    }

    // Sorting
    query = query.order(params.sort, { ascending: params.order === 'asc' })

    // Pagination
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    // Enrich response with portfolio_name for AI readability
    const enriched = (data || []).map((row) => {
      const { portfolios, ...property } = row as Record<string, unknown> & {
        portfolios: { name: string }
      }
      return {
        ...property,
        portfolio_name: portfolios?.name ?? null,
      }
    })

    return listResponse(enriched, count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * POST /api/v1/properties
 * Create a new property.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')

    const body = await parseBody(request, createPropertySchema)
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Verify portfolio belongs to this org
    const { data: portfolio } = await supabase
      .from('portfolios')
      .select('id')
      .eq('id', body.portfolio_id)
      .eq('org_id', auth.orgId)
      .is('deleted_at', null)
      .single()

    if (!portfolio) {
      const { ApiError } = await import('@/lib/errors')
      throw new ApiError(
        'VALIDATION_ERROR',
        '1 validation error',
        400,
        [{ field: 'portfolio_id', message: `Portfolio '${body.portfolio_id}' not found in your organization` }]
      )
    }

    // Insert the property
    const now = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('properties')
      .insert({
        ...body,
        org_id: auth.orgId,
        created_at: now,
        updated_at: now,
      })
      .select('*, portfolios!inner(name)')
      .single()

    if (error) throw error

    // Audit log
    await auditCreate({
      orgId: auth.orgId,
      entityType: 'property',
      entityId: created.id,
      newValues: body,
      changedBy: auth.userId,
      changeSource,
    })

    // Enrich response
    const { portfolios, ...property } = created as Record<string, unknown> & {
      portfolios: { name: string }
    }

    return successResponse(
      { ...property, portfolio_name: portfolios?.name ?? null },
      requestId,
      201
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
