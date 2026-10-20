'use client'

import { useEffect } from 'react'
import { shouldCarryAuthHash } from '@/lib/auth-link-shared'

// Emailed links are meant to land on /auth/confirm. Two things can put them
// somewhere else, and neither is an error the sender ever sees: Supabase puts
// the session in the URL *hash* (which no server can read), and it silently
// swaps in the Site URL when the redirect the app asked for is not in the
// allow-list. A hash that lands on the site root — or on a path from an older
// email — would otherwise just sit in the address bar.
//
// This runs on every page, so it is deliberately limited to the links the app
// itself can send: a password reset (`recovery`), an invite (`invite`, which is
// what `generateLink` labels the verification URL), and a magic sign-in
// (`magiclink`, `signup`). Anything else is left exactly where it was.
//
// `invite` matters more than it looks: `generateLink` only ever preserves a
// bare origin in `redirect_to`, so an invite link always arrives at the site
// root with the session in the hash. Without this, the invitee would sit on the
// marketing page with a session they never get handed to the set-password form.
// The list itself lives in `lib/auth-link-shared.ts` so a test can pin it.

export function AuthLinkCatcher() {
  useEffect(() => {
    // The one page that does want the fragment; sending it to itself would be
    // a navigation to a byte-identical URL.
    if (window.location.pathname === '/auth/confirm') return

    const hash = window.location.hash.slice(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    if (!shouldCarryAuthHash(params)) return

    // A scripted navigation drops the fragment, so it is carried by hand.
    window.location.replace(`/auth/confirm${window.location.search}${window.location.hash}`)
  }, [])

  return null
}
