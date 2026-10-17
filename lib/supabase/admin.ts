import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// The service-role client for API routes.
//
// External callers authenticate with an API key, not a browser session, so
// there is no user cookie to key row-level security off — the key's owner must
// be resolved with privileges that can read `api_keys` at all.
//
// This client BYPASSES RLS. Every query made with it must constrain itself to
// the authenticated user's id explicitly. Never import this into a client
// component or anything that ships to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'The integration API needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Whether the service role key is present, so routes can fail with advice. */
export function adminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}
