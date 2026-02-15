import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createCustomFieldSchema, listCustomFieldsQuery } from '@/lib/schemas/custom-fields'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listCustomFieldsQuery)

    let query = supabase
      .from('custom_field_definitions')
      .select('*', { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (params.entity_type) {
      query = query.eq('entity_type', params.entity_type)
    }

    query = query.order(params.sort, { ascending: params.order === 'asc' })
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return listResponse(data || [], count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const body = await parseBody(request, createCustomFieldSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const { data: created, error } = await supabase
      .from('custom_field_definitions')
      .insert({ ...body, org_id: auth.orgId })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { ApiError } = await import('@/lib/errors')
        throw new ApiError(
          'CONFLICT',
          `A custom field '${body.field_name}' already exists for ${body.entity_type} in this organization`,
          409
        )
      }
      throw error
    }

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'custom_field_definition',
      entityId: created.id,
      newValues: body,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(created, requestId, 201)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
