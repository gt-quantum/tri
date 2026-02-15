import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createUserSchema, listUsersQuery } from '@/lib/schemas/users'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')
    const params = parseQuery(request.nextUrl.searchParams, listUsersQuery)

    let query = supabase
      .from('users')
      .select('id, org_id, email, full_name, role, created_at, deleted_at', { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (params.include_deleted !== 'true') {
      query = query.is('deleted_at', null)
    }
    if (params.role) {
      query = query.eq('role', params.role)
    }
    if (params.search) {
      query = query.or(`full_name.ilike.%${params.search}%,email.ilike.%${params.search}%`)
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

    const body = await parseBody(request, createUserSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    const now = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('users')
      .insert({ ...body, org_id: auth.orgId, created_at: now })
      .select('id, org_id, email, full_name, role, created_at')
      .single()

    if (error) {
      // Handle unique constraint violation (duplicate email in org)
      if (error.code === '23505') {
        const { ApiError } = await import('@/lib/errors')
        throw new ApiError('CONFLICT', `A user with email '${body.email}' already exists in this organization`, 409)
      }
      throw error
    }

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'user',
      entityId: created.id,
      newValues: { email: body.email, full_name: body.full_name, role: body.role },
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(created, requestId, 201)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
