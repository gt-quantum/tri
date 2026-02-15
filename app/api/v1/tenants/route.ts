import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse, ApiError } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import { createTenantSchema, listTenantsQuery } from '@/lib/schemas/tenants'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listTenantsQuery)

    let query = supabase
      .from('tenants')
      .select('id, org_id, company_name, industry, website, primary_contact_name, primary_contact_email, primary_contact_phone, credit_rating, parent_tenant_id, metadata, created_at, updated_at, deleted_at', { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (params.include_deleted !== 'true') {
      query = query.is('deleted_at', null)
    }
    if (params.industry) {
      query = query.eq('industry', params.industry)
    }
    if (params.credit_rating) {
      query = query.eq('credit_rating', params.credit_rating)
    }
    if (params.parent_tenant_id) {
      query = query.eq('parent_tenant_id', params.parent_tenant_id)
    }
    if (params.search) {
      query = query.ilike('company_name', `%${params.search}%`)
    }

    query = query.order(params.sort, { ascending: params.order === 'asc' })
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    // Enrich with parent_tenant_name where applicable
    const parentIds = [
      ...new Set(
        (data || [])
          .map((t) => (t as Record<string, unknown>).parent_tenant_id as string | null)
          .filter(Boolean)
      ),
    ] as string[]

    let parentMap: Record<string, string> = {}
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from('tenants')
        .select('id, company_name')
        .in('id', parentIds)
        .eq('org_id', auth.orgId)

      parentMap = Object.fromEntries(
        (parents || []).map((p) => [p.id, p.company_name])
      )
    }

    const enriched = (data || []).map((row) => ({
      ...(row as Record<string, unknown>),
      parent_tenant_name: row.parent_tenant_id
        ? parentMap[row.parent_tenant_id as string] ?? null
        : null,
    }))

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

    const body = await parseBody(request, createTenantSchema)
    const changeSource = parseChangeSource(request.headers.get('x-change-source'))

    // Validate parent_tenant_id belongs to same org
    if (body.parent_tenant_id) {
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

    const now = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('tenants')
      .insert({ ...body, org_id: auth.orgId, created_at: now, updated_at: now })
      .select('id, org_id, company_name, industry, website, primary_contact_name, primary_contact_email, primary_contact_phone, credit_rating, parent_tenant_id, metadata, created_at, updated_at')
      .single()

    if (error) throw error

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'tenant',
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
