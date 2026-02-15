import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { ApiError, errorResponse, notFound } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'
import { auditCreate, auditSoftDelete, parseChangeSource } from '@/lib/audit'
import {
  generateApiKey,
  hashApiKey,
  extractKeyPrefix,
} from '@/lib/api-keys'

/**
 * POST /api/v1/api-keys/:id/rotate
 * Rotate an API key: revokes the old key and creates a new one
 * with the same name, role, and description. Admin only.
 * Returns the new plaintext key (shown once).
 */
export async function POST(
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
      .select('id, org_id, name, description, role, revoked_at, expires_at')
      .eq('id', id)
      .eq('org_id', auth.orgId)
      .single()

    if (fetchError || !existing) throw notFound('API key', id)

    if (existing.revoked_at) {
      throw new ApiError(
        'CONFLICT',
        'Cannot rotate a revoked API key. Create a new key instead.',
        409
      )
    }

    // 1. Revoke the old key (org-scoped for defense-in-depth)
    await supabase
      .from('api_keys')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: auth.userId,
      })
      .eq('id', id)
      .eq('org_id', auth.orgId)

    await auditSoftDelete({
      orgId: auth.orgId,
      entityType: 'api_key',
      entityId: id,
      changedBy: auth.userId,
      changeSource,
    })

    // 2. Create a new key with the same metadata
    const plaintextKey = generateApiKey()
    const keyHash = hashApiKey(plaintextKey)
    const keyPrefix = extractKeyPrefix(plaintextKey)

    // Preserve original expiration duration from the old key,
    // but calculate new expiration from now
    const oldDuration =
      new Date(existing.expires_at).getTime() - Date.now()
    const newExpiresAt = new Date(
      Date.now() + Math.max(oldDuration, 30 * 24 * 60 * 60 * 1000) // At least 30 days
    ).toISOString()

    const { data: newKey, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        org_id: auth.orgId,
        name: existing.name,
        description: existing.description,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        role: existing.role,
        created_by: auth.userId,
        expires_at: newExpiresAt,
      })
      .select(
        'id, org_id, name, description, key_prefix, role, scopes, created_by, last_used_at, expires_at, revoked_at, created_at, updated_at'
      )
      .single()

    if (insertError) throw insertError

    await auditCreate({
      orgId: auth.orgId,
      entityType: 'api_key',
      entityId: newKey.id,
      newValues: {
        name: existing.name,
        role: existing.role,
        expires_at: newExpiresAt,
        key_prefix: keyPrefix,
        rotated_from: id,
      },
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(
      {
        ...newKey,
        key: plaintextKey, // Shown exactly once
        rotated_from: id,
      },
      requestId,
      201
    )
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
