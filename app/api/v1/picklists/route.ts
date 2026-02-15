import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createPicklistSchema, listPicklistsQuery } from '@/lib/schemas/picklists'

/**
 * GET /api/v1/picklists
 * List picklist values. Returns both org-specific and system-wide defaults.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listPicklistsQuery)

    // Include both org-specific (org_id = auth.orgId) and system defaults (org_id IS NULL)
    let query = supabase
      .from('picklist_definitions')
      .select('*', { count: 'exact' })
      .or(`org_id.eq.${auth.orgId},org_id.is.null`)

    if (params.entity_type) {
      query = query.eq('entity_type', params.entity_type)
    }
    if (params.field_name) {
      query = query.eq('field_name', params.field_name)
    }
    if (params.is_active !== undefined) {
      query = query.eq('is_active', params.is_active === 'true')
    }

    query = query.order(params.sort, { ascending: params.order === 'asc' })
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Mark each entry as 'system' or 'org' for clarity
    const enriched = (data || []).map((row) => ({
      ...row,
      scope: row.org_id === null ? 'system' : 'org',
    }))

    return listResponse(enriched, count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * POST /api/v1/picklists
 * Create an org-specific picklist value.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    requireRole(auth, 'admin')

    const body = await parseBody(request, createPicklistSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: created, error } = await supabase
      .from('picklist_definitions')
      .insert({ ...body, org_id: auth.orgId })
      .select()
      .single()

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        const { ApiError } = await import('@/lib/errors')
        throw new ApiError(
          'CONFLICT',
          `A picklist value '${body.value}' already exists for ${body.entity_type}.${body.field_name} in this organization`,
          409
        )
      }
      throw error
    }

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'picklist_definition',
      entityId: created.id,
      newValues: body,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse({ ...created, scope: 'org' }, requestId, 201)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
