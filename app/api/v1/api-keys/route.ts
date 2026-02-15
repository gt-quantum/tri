import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import {
  generateRequestId,
  successResponse,
  listResponse,
} from '@/lib/response'
import { parseBody, parseQuery } from '@/lib/validation'
import { auditCreate, parseChangeSource } from '@/lib/audit'
import {
  createApiKeySchema,
  listApiKeysQuery,
} from '@/lib/schemas/api-keys'
import {
  generateApiKey,
  hashApiKey,
  extractKeyPrefix,
} from '@/lib/api-keys'

/**
 * Explicit field list for API key responses.
 * Never includes key_hash or plaintext key.
 */
const API_KEY_SELECT =
  'id, org_id, name, description, key_prefix, role, scopes, created_by, last_used_at, expires_at, revoked_at, revoked_by, created_at, updated_at, users!api_keys_created_by_fkey(full_name, email)'

/**
 * GET /api/v1/api-keys
 * List all API keys for the org. Admin only.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const query = parseQuery(request.nextUrl.searchParams, listApiKeysQuery)

    let q = supabase
      .from('api_keys')
      .select(API_KEY_SELECT, { count: 'exact' })
      .eq('org_id', auth.orgId)

    if (query.include_revoked !== 'true') {
      q = q.is('revoked_at', null)
    }

    q = q
      .order('created_at', { ascending: false })
      .range(query.offset, query.offset + query.limit - 1)

    const { data, error, count } = await q

    if (error) throw error

    const enriched = (data || []).map((row) => {
      const { users, ...key } = row as unknown as Record<string, unknown> & {
        users: { full_name: string; email: string } | null
      }
      return {
        ...key,
        created_by_name: users?.full_name ?? null,
        created_by_email: users?.email ?? null,
        status: getKeyStatus(key),
      }
    })

    return listResponse(enriched, count ?? 0, query.limit, query.offset, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}

/**
 * POST /api/v1/api-keys
 * Create a new API key. Admin only.
 * Returns the plaintext key exactly once.
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'admin')

    const body = await parseBody(request, createApiKeySchema)
    const changeSource = parseChangeSource(
      request.headers.get('x-change-source')
    )

    // Generate the key
    const plaintextKey = generateApiKey()
    const keyHash = hashApiKey(plaintextKey)
    const keyPrefix = extractKeyPrefix(plaintextKey)

    // Calculate expiration
    const expiresAt = new Date(
      Date.now() + body.expires_in_days * 24 * 60 * 60 * 1000
    ).toISOString()

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        org_id: auth.orgId,
        name: body.name,
        description: body.description || null,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        role: body.role,
        created_by: auth.userId,
        expires_at: expiresAt,
      })
      .select(
        'id, org_id, name, description, key_prefix, role, scopes, created_by, last_used_at, expires_at, revoked_at, created_at, updated_at'
      )
      .single()

    if (error) throw error

    // Audit log (never log the key itself)
    await auditCreate({
      orgId: auth.orgId,
      entityType: 'api_key',
      entityId: apiKey.id,
      newValues: {
        name: body.name,
        role: body.role,
        expires_at: expiresAt,
        key_prefix: keyPrefix,
      },
      changedBy: auth.userId,
      changeSource,
    })

    return successResponse(
      {
        ...apiKey,
        key: plaintextKey, // Shown exactly once
      },
      requestId,
      201
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
