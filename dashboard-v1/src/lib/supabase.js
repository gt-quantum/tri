import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY in .env')
}

// Using service_role key to bypass RLS for this dev dashboard.
// NEVER expose service_role key in production client-side code.
export const supabase = createClient(supabaseUrl, supabaseKey)
