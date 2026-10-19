'use client'

import { useEffect } from 'react'

// Emailed links are meant to land on /auth/confirm. Two things can put them
// somewhere else, and neither is an error the sender ever sees: Supabase puts
// the session in the URL *hash* (which no server can read), and it silently
// swaps in the Site URL when the redirect the app asked for is not in the
// allow-list. A hash that lands on the site root — or on a path from an older
// email — would otherwise just sit in the address bar.
//
// This runs on every page, so it is deliberately limited to the links the app
// itself can send: a password reset (`recovery`) and an invite/magic sign-in
// (`magiclink`, `signup`). Anything else is left exactly where it was.
const CARRIED_TYPES = new Set(['recovery', 'magiclink', 'signup'])

export function AuthLinkCatcher() {
  useEffect(() => {
    // The one page that does want the fragment; sending it to itself would be
    // a navigation to a byte-identical URL.
    if (window.location.pathname === '/auth/confirm') return

    const hash = window.location.hash.slice(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    // A refusal carries no `type` — an expired or already-used link — and is
    // still worth answering with the expired-link card rather than silence.
    const refused = Boolean(params.get('error') || params.get('error_code'))
    if (!refused && !CARRIED_TYPES.has(params.get('type') ?? '')) return

    // A scripted navigation drops the fragment, so it is carried by hand.
    window.location.replace(`/auth/confirm${window.location.search}${window.location.hash}`)
  }, [])

  return null
}
