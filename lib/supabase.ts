import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Server-side Supabase client using the service_role key.
 * Lazily initialized on first call (env vars aren't available at build time).
 * This bypasses RLS — the API layer handles access control.
 * NEVER expose this client or key to the browser.
 */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
      )
    }
    _client = createClient(url, key)
  }
  return _client
}

/**
 * Drop-in lazy proxy — all route files can continue using `supabase.from(...)`.
 * The real client is created on first property access (at request time, not build time).
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop]
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
