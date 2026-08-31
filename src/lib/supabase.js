import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Don't throw at import time if env vars are missing (Vercel builds fine; we
// surface a clean error on first use instead of a white screen).
export const supabase = (url && anonKey)
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null

export const supabaseReady = Boolean(supabase)
export function requireSupabase() {
  if (!supabase) throw new Error(
    'Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel (or .env locally).'
  )
  return supabase
}
