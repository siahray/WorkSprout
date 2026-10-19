'use client'

import { useEffect } from 'react'

// Recovery links are meant to land on /auth/confirm. When Supabase will not
// accept the redirect the app asked for it puts the session on the site root
// instead — which is what the reported "resets just go back to the landing
// page" looks like from the outside. This watches for that fragment wherever
// it lands and forwards it to the page that can finish the job; the hash is
// carried along by hand, because a scripted navigation drops it.
export function RecoveryLinkCatcher() {
  useEffect(() => {
    // /auth/confirm is the page that does want the fragment; forwarding to it
    // from itself would be pointless (and, with the fragment preserved, a
    // navigation to the identical URL).
    if (window.location.pathname === '/auth/confirm') return

    const hash = window.location.hash.slice(1)
    if (!hash) return

    const params = new URLSearchParams(hash)
    const isRecoveryLink = params.get('type') === 'recovery'
    const isRefusedLink = Boolean(params.get('error') || params.get('error_code'))
    // Recovery only, on purpose: this runs on every page, and other emailed
    // links (an invite, say) have their own landing page and their own next
    // step. Widening this would quietly reroute them.
    if (!isRecoveryLink && !isRefusedLink) return

    window.location.replace(`/auth/confirm${window.location.search}${window.location.hash}`)
  }, [])

  return null
}
