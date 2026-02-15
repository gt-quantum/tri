import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createPortfolioSchema, listPortfoliosQuery } from '@/lib/schemas/portfolios'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listPortfoliosQuery)

    let query = supabase
      .from('portfolios')
      .select('*', { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (params.include_deleted !== 'true') {
      query = query.is('deleted_at', null)
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
    const auth = getAuthContext(request)
    requireRole(auth, 'manager')

    const body = await parseBody(request, createPortfolioSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const now = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('portfolios')
      .insert({ ...body, org_id: auth.orgId, created_at: now, updated_at: now })
      .select()
      .single()

    if (error) throw error

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'portfolio',
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
