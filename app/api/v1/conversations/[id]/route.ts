import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext } from '@/lib/auth'
import { errorResponse, notFound } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { updateConversationSchema } from '@/lib/schemas/conversations'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/conversations/:id
 * Get full conversation with messages.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const { id } = await params

    const { data, error } = await supabase
      .from('ai_conversations')
      .select('id, title, source, is_archived, messages, context, created_at, updated_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .single()

    if (error || !data) throw notFound('Conversation', id)

    return successResponse(data, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * PATCH /api/v1/conversations/:id
 * Update conversation title, archive, or promote source.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const { id } = await params
    const body = await parseBody(request, updateConversationSchema)

    const { data: updated, error } = await supabase
      .from('ai_conversations')
      .update(body)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)
      .select('id, title, source, is_archived, created_at, updated_at')
      .single()

    if (error || !updated) throw notFound('Conversation', id)

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * DELETE /api/v1/conversations/:id
 * Hard delete a conversation.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    const { id } = await params

    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .eq('user_id', auth.userId)

    if (error) throw error

    return successResponse({ deleted: true }, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
