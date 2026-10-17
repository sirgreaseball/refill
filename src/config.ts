// The shared demo database. A publishable key is public by design: it can only
// call the functions granted to anon in supabase/migrations, never the tables.
// Point the app at your own project with VITE_SUPABASE_URL / VITE_SUPABASE_KEY.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {}

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? 'https://mbvxzuuuuzgpmsjggblo.supabase.co'
export const SUPABASE_KEY = env.VITE_SUPABASE_KEY ?? 'sb_publishable_ryEL0v7jX95iyOeTVLxM-A_TKGLNKV-'
