import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/site'

// Supabase emails a recovery link that lands here with a short-lived PKCE `code`.
// We exchange it for a real session — without this, the reset page would have no
// session and updateUser would have nothing to act on.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/reset-password'

  const origin = await siteUrl()

  // Only ever return to an in-app path — never an attacker-supplied URL.
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/reset-password'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`)
    console.error('auth code exchange failed:', error.message)
  }

  // A bad or expired code still deserves a way forward rather than a dead end.
  return NextResponse.redirect(`${origin}/forgot-password?expired=1`)
}
