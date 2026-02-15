import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse, notFound } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { parseBody } from '@/lib/validation'
import { auditUpdate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import { updateApiKeySchema } from '@/lib/schemas/api-keys'

const API_KEY_SELECT =
  'id, org_id, name, description, key_prefix, role, scopes, created_by, last_used_at, last_used_ip, expires_at, revoked_at, revoked_by, created_at, updated_at, users!api_keys_created_by_fkey(full_name, email)'

/**
 * GET /api/v1/api-keys/:id
 * Get API key details. Admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const { id } = await params

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .select(API_KEY_SELECT)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (error || !apiKey) throw notFound('API key', id)

    const { users, ...key } = apiKey as unknown as Record<string, unknown> & {
      users: { full_name: string; email: string } | null
    }

    return successResponse(
      {
        ...key,
        created_by_name: users?.full_name ?? null,
        created_by_email: users?.email ?? null,
        status: getKeyStatus(key),
      },
      requestId
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * PATCH /api/v1/api-keys/:id
 * Update API key metadata (name, description only). Admin only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const { id } = await params
    const body = await parseBody(request, updateApiKeySchema)
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Fetch existing key (org-scoped, includes revoked_at for guard check)
    const { data: existing, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, org_id, name, description, revoked_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !existing) throw notFound('API key', id)

    if (existing.revoked_at) {
      throw new ApiError(
        'CONFLICT',
        'Cannot update a revoked API key',
        409
      )
    }

    // Update
    const { data: updated, error: updateError } = await supabase
      .from('api_keys')
      .update(body)
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select(
        'id, org_id, name, description, key_prefix, role, scopes, created_by, last_used_at, expires_at, revoked_at, created_at, updated_at'
      )
      .single()

    if (updateError) throw updateError

    // Audit field-level changes
    await auditUpdate({
      orgId: auth.orgId,
      entityType: 'api_key',
      entityId: id,
      oldRecord: existing,
      newRecord: body,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(updated, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * DELETE /api/v1/api-keys/:id
 * Revoke an API key (soft revocation). Admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const { id } = await params
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Fetch existing key
    const { data: existing, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, org_id, name, revoked_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !existing) throw notFound('API key', id)

    if (existing.revoked_at) {
      throw new ApiError(
        'CONFLICT',
        'API key is already revoked',
        409
      )
    }

    // Revoke
    const { data: revoked, error: updateError } = await supabase
      .from('api_keys')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: auth.userId,
      })
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .select(
        'id, org_id, name, key_prefix, role, revoked_at, revoked_by, created_at'
      )
      .single()

    if (updateError) throw updateError

    // Audit
    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'api_key',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(
      { id: revoked.id, revoked: true, name: revoked.name },
      requestId
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

function getKeyStatus(key: Record<string, unknown>): string {
  if (key.revoked_at) return 'revoked'
  if (key.expires_at && new Date(key.expires_at as string) < new Date())
    return 'expired'
  return 'active'
}
