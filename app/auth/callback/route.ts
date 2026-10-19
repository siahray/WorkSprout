import { logError } from '@/lib/log'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/site'
import { safeNextPath } from '@/lib/safe-next'

// Legacy landing spot for emailed recovery links: these carry a short-lived
// PKCE `code`, which only the browser that requested the email can exchange
// (its verifier lives in that browser's cookie), so the exchange has to happen
// here on the server. Recovery emails now point at /auth/confirm instead, where
// the session comes back in the URL hash and any device can finish the job.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'), '/reset-password')

  const origin = await siteUrl()

  if (!code) {
    // Nothing to exchange — most likely a hash-shaped link, which a server can
    // never see. Hand it to the page that can read a hash; the browser carries
    // the fragment across this redirect.
    return NextResponse.redirect(`${origin}/auth/confirm?next=${encodeURIComponent(next)}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (!error) return NextResponse.redirect(`${origin}${next}`)

  logError('auth code exchange failed', { error })
  // A bad or already-used code still deserves a way forward rather than a dead end.
  return NextResponse.redirect(`${origin}/forgot-password?expired=1`)
}
