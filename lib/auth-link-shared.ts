// The pure half of the emailed-link handling, kept free of server-only imports
// so it can be tested directly (see test/auth-link-simple.test.ts).
//
// Why this exists at all: `generateLink` — which is how the invite and reset
// emails are sent from our own Resend config rather than Supabase's — only ever
// preserves a *bare origin* in `redirect_to`. Ask for
// `https://host/auth/confirm?next=/reset-password` and you get
// `https://host` back; the path and query are dropped. The session therefore
// always arrives at the site root, in the URL hash, and something has to hand
// it to `/auth/confirm`. That something is AuthLinkCatcher, and this is the
// list of `type` values it must not ignore.

/** Hash `type` values the app itself can produce, and so must forward. */
export const CARRIED_LINK_TYPES: readonly string[] = ['recovery', 'invite', 'magiclink', 'signup']

/** Where a link lands when it carries no `next` of its own. Both the invite
    ("set a password") and the reset ("choose a new one") want this page. */
export const DEFAULT_LINK_DESTINATION = '/reset-password'

/** True when a hash should be forwarded to /auth/confirm: either it names a
    type we send, or it is a refusal (which carries no type but still deserves
    the expired-link card rather than silence). */
export function shouldCarryAuthHash(params: URLSearchParams): boolean {
  const refused = Boolean(params.get('error') || params.get('error_code'))
  if (refused) return true
  return CARRIED_LINK_TYPES.includes(params.get('type') ?? '')
}

/** The destination for a forwarded link: the requested in-app path if there is
    one, otherwise the default. */
export function linkDestination(next: string | null | undefined): string {
  if (!next?.startsWith('/')) return DEFAULT_LINK_DESTINATION
  if (next.startsWith('//') || next.startsWith('/\\')) return DEFAULT_LINK_DESTINATION
  return next
}

/** Supabase's own strings are not written for the person clicking the button. */
export function readableAuthLinkError(message: string): string {
  if (/rate limit/i.test(message)) return 'Too many requests just now — wait a few minutes and try again.'
  if (/already registered|already exists/i.test(message)) return 'That email already has an account.'
  if (/not found/i.test(message)) return 'We could not send that email.'
  return 'Could not prepare the email — please try again.'
}
