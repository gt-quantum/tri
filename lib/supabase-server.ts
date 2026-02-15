import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client that reads auth from cookies.
 * Uses the anon key — respects RLS policies.
 * For use in Server Components, Route Handlers, and Server Actions.
 *
 * This is different from the admin client in lib/supabase.ts which
 * uses the service_role key and bypasses RLS.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll can fail in Server Components (read-only context).
            // This is expected — session refresh happens in middleware.
          }
        },
      },
    }
  )
}
