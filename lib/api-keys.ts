import { randomBytes, createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiError } from '@/lib/errors'
import type { AuthContext } from '@/lib/auth'

const API_KEY_PREFIX = 'sk_live_'

/**
 * Generate a new API key: sk_live_ + 32 random hex chars (128 bits of entropy).
 * Returns the full plaintext key (shown once to the user, never stored).
 */
export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(16).toString('hex')
}

/**
 * SHA-256 hash of the full API key for storage and lookup.
 * SHA-256 is appropriate here (unlike passwords, API keys have high entropy).
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Extract the first 12 characters of the key for display/identification.
 * Example: "sk_live_a3b4" from "sk_live_a3b4c5d6..."
 */
export function extractKeyPrefix(key: string): string {
  return key.slice(0, 12)
}

/**
 * Validate an API key and return an AuthContext if valid.
 *
 * Flow:
 * 1. SHA-256 hash the incoming key
 * 2. Look up api_keys by key_hash (join users for creator info)
 * 3. Verify: not expired, not revoked
 * 4. Update last_used_at + last_used_ip (fire-and-forget)
 * 5. Return AuthContext (userId = key creator, role = key role)
 */
export async function validateApiKey(
  key: string,
  request: NextRequest
): Promise<AuthContext> {
  const hash = hashApiKey(key)

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select(
      'id, org_id, role, created_by, expires_at, revoked_at, users!api_keys_created_by_fkey(email, full_name)'
    )
    .eq('key_hash', hash)
    .single()

  if (error || !apiKey) {
    throw new ApiError('UNAUTHORIZED', 'Invalid API key', 401)
  }

  // Check revocation
  if (apiKey.revoked_at) {
    throw new ApiError('UNAUTHORIZED', 'API key has been revoked', 401)
  }

  // Check expiration
  if (new Date(apiKey.expires_at) < new Date()) {
    throw new ApiError('UNAUTHORIZED', 'API key has expired', 401)
  }

  // Update last_used_at and last_used_ip (fire-and-forget — don't slow down the request)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null

  supabase
    .from('api_keys')
    .update({
      last_used_at: new Date().toISOString(),
      last_used_ip: clientIp,
    })
    .eq('id', apiKey.id)
    .then(() => {
      // Intentionally ignored — fire-and-forget
    })

  const creator = apiKey.users as unknown as {
    email: string
    full_name: string | null
  } | null

  return {
    userId: apiKey.created_by,
    orgId: apiKey.org_id,
    role: apiKey.role as 'admin' | 'manager' | 'viewer',
    email: creator?.email || '',
    fullName: creator?.full_name || creator?.email || '',
  }
}
