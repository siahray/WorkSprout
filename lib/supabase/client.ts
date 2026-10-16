import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Safe to call multiple times — @supabase/ssr
// reuses the singleton client if one already exists on `window`.
// Server components/actions must use `lib/supabase/server` instead, which
// reads the request's cookies.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
