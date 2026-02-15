import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, listResponse } from '@/lib/response'
import { parseQuery } from '@/lib/validation'
import { listAuditLogQuery } from '@/lib/schemas/audit-log'

/**
 * GET /api/v1/audit-log
 * Query the audit log. Read-only. Enriched with changed_by_name.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listAuditLogQuery)

    let query = supabase
      .from('audit_log')
      .select('*, users!audit_log_changed_by_fkey(full_name)', { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (params.entity_type) {
      query = query.eq('entity_type', params.entity_type)
    }
    if (params.entity_id) {
      query = query.eq('entity_id', params.entity_id)
    }
    if (params.field_name) {
      query = query.eq('field_name', params.field_name)
    }
    if (params.action) {
      query = query.eq('action', params.action)
    }
    if (params.changed_by) {
      query = query.eq('changed_by', params.changed_by)
    }
    if (params.change_source) {
      query = query.eq('change_source', params.change_source)
    }
    if (params.since) {
      query = query.gte('changed_at', params.since)
    }
    if (params.until) {
      query = query.lte('changed_at', params.until)
    }

    query = query.order(params.sort, { ascending: params.order === 'asc' })
    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    const enriched = (data || []).map((row) => {
      const { users, ...entry } = row as Record<string, unknown> & {
        users: { full_name: string } | null
      }
      return {
        ...entry,
        changed_by_name: users?.full_name ?? null,
      }
    })

    return listResponse(enriched, count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
