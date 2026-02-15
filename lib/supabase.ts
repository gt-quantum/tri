import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
  )
}

/**
 * Server-side Supabase client using the service_role key.
 * This bypasses RLS — the API layer handles access control.
 * NEVER expose this client or key to the browser.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey)
