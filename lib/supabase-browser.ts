import { createBrowserClient } from '@supabase/ssr'

/**
 * Browser-side Supabase client for auth UI and client-side queries.
 * Uses the anon key — respects RLS policies.
 * Safe to use in 'use client' components.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
