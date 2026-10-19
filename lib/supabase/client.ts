import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Safe to call multiple times — @supabase/ssr
// reuses the singleton client if one already exists on `window`.
// Server components/actions must use `lib/supabase/server` instead, which
// reads the request's cookies.
//
// URL detection is off on purpose: `/auth/confirm` reads the recovery session
// out of the address bar itself, so letting the SDK race it for the hash would
// be two ways to consume one link. Nothing else in the app signs in from a URL.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { detectSessionInUrl: false } }
  )
}
