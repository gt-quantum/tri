import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse, listResponse } from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { listConversationsQuery, createConversationSchema } from '@/lib/schemas/conversations'

/**
 * GET /api/v1/conversations
 * List the current user's conversations.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const params = parseQuery(request.nextUrl.searchParams, listConversationsQuery)

    let query = supabase
      .from('ai_conversations')
      .select('id, title, source, is_archived, created_at, updated_at', { count: 'exact' })
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })

    if (params.include_archived !== 'true') {
      query = query.eq('is_archived', false)
    }

    if (params.source) {
      query = query.eq('source', params.source)
    }

    query = query.range(params.offset, params.offset + params.limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return listResponse(data || [], count ?? 0, params.limit, params.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * POST /api/v1/conversations
 * Create a new empty conversation.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const body = await parseBody(request, createConversationSchema)

    const { data: created, error } = await supabase
      .from('ai_conversations')
      .insert({
        org_id: auth.orgId,
        user_id: auth.userId,
        title: body.title || 'New conversation',
        source: body.source || 'widget',
        context: body.context || null,
        messages: [],
      })
      .select('id, title, source, is_archived, created_at, updated_at')
      .single()

    if (error) throw error

    return successResponse({ ...created, message_count: 0 }, requestId, 201)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
