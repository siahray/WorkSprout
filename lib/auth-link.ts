// Minting the two auth links we send ourselves, instead of letting Supabase
// send them in its own template.
//
// Supabase separates *making* a link from *sending* it: `generateLink` returns
// the same URL that `signInWithOtp` / `resetPasswordForEmail` would have
// emailed, without dispatching anything. That is what lets the invite and the
// reset ride our Resend config — our sender, our design — while the link still
// lands on `/auth/confirm`, which turns it into a session exactly as before.
//
// Requires the service-role key, so every entry point here is gated on
// `isAdminConfigured()`. Until the key is in the environment these return a
// not-configured result and the caller says so; nothing crashes.

import { adminClientConfigured, createAdminClient } from '@/lib/supabase/admin'
import { readableAuthLinkError } from '@/lib/auth-link-shared'
import { logError } from '@/lib/log'

export type AuthLinkKind = 'invite' | 'recovery'

export type AuthLinkResult =
  | { ok: true; actionLink: string; email: string }
  | { ok: false; error: string; notConfigured?: boolean }

// `invite` creates the account when the address is not known yet; `recovery`
// only ever acts on an account that already exists. The caller does not choose
// between those — the type does.
export async function generateAuthLink(input: {
  kind: AuthLinkKind
  email: string
  /** Where the emailed link should land. Must be in Supabase's redirect allow-list. */
  redirectTo: string
}): Promise<AuthLinkResult> {
  if (!adminClientConfigured()) {
    return {
      ok: false,
      notConfigured: true,
      error: 'Email is not configured yet. Add SUPABASE_SERVICE_ROLE_KEY.',
    }
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.generateLink({
    type: input.kind,
    email: input.email,
    options: {
      redirectTo: input.redirectTo,
    },
  })

  if (error) {
    logError('generate auth link failed', { kind: input.kind, error })
    return { ok: false, error: readableAuthLinkError(error.message) }
  }

  const actionLink = data?.properties?.action_link
  if (!actionLink) {
    logError('generate auth link returned no link', { kind: input.kind })
    return { ok: false, error: 'Could not prepare the link — please try again.' }
  }

  return { ok: true, actionLink, email: input.email }
}
