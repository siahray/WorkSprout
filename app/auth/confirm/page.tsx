'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { LinkExpiredCard } from '@/components/link-expired-card'
import { LogoMark } from '@/components/logo-mark'
import { safeNextPath } from '@/lib/safe-next'
import { createClient } from '@/lib/supabase/client'

// Where the emailed recovery link lands.
//
// Supabase hands the session back in the URL *hash* (`#access_token=…`), and a
// fragment is never sent to a server — which is why a route handler here could
// not finish the job and why the reset appeared to expire instantly. Reading it
// in the browser also means nothing depends on a verifier cookie written when
// the email was requested, so the link works from any browser or device.
type Outcome = { next: string } | null

export default function ConfirmPage() {
  const router = useRouter()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true

    async function complete(): Promise<Outcome> {
      const query = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.slice(1))
      const next = safeNextPath(query.get('next'), '/reset-password')

      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const error = hash.get('error_code') ?? hash.get('error') ?? query.get('error_code') ?? query.get('error')

      // Used-up links and refusals arrive as an error instead of a session.
      if (error || !accessToken || !refreshToken) return null

      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      return sessionError ? null : { next }
    }

    void complete().then((outcome) => {
      // Either way, the session material has no business staying in the bar.
      window.history.replaceState(null, '', window.location.pathname)
      if (!active) return
      if (outcome) router.replace(outcome.next)
      else setFailed(true)
    })

    return () => {
      active = false
    }
  }, [router])

  return (
    <AuthShell heading="One moment." text="We&rsquo;re checking the link that brought you here.">
      {failed ? (
        <LinkExpiredCard />
      ) : (
        <div className="mx-auto w-full max-w-md px-6">
          <div
            role="status"
            className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 text-center shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]"
          >
            <span className="inline-flex items-center justify-center rounded-2xl bg-[#0E2F27] p-3">
              <LogoMark size={22} className="ws-pulse" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Checking your link&hellip;</h1>
            <p className="mt-2 text-[#0E2F27]/65">
              One moment while we verify it and sign you in.
            </p>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
