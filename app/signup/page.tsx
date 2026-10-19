import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthShell } from '@/components/auth-shell'
import { btnMango, focus } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Create your account · WorkSprout',
  robots: { index: false, follow: false },
}


// Beta access is invite-only, and the invite email carries a *link*, not a
// one-time code: no template in this project fills `{{ .Token }}`, and the free
// tier will not let us add one. That link is the whole sign-up — it lands on
// /auth/confirm, which turns it into a session that /reset-password converts
// into a password — so there is nothing to type here. This page says so plainly
// to anyone who arrives looking for a form: "Sign up" on the login page, or an
// invite email sent before the flow changed.
export default async function SignupPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/dashboard')

  return (
    <AuthShell
      heading="Invite only, for now."
      text="We email you a link that sets your password. Open it and you&rsquo;re in."
    >
      <div className="mx-auto w-full max-w-md px-6">
        <div className="rounded-panel border border-line bg-panel p-8 text-center shadow-overlay">
          <h1 className="text-2xl font-extrabold tracking-tight">Check your invite email</h1>
          <p className="mt-2 text-ink-2">
            Open the link in that email and choose the password you&rsquo;ll use from now on &mdash; there&rsquo;s no
            code to type.
          </p>

          <Link
            href="/join"
            className={`mt-6 w-full ${btnMango}`}
          >
            Join the beta
          </Link>

          <p className="mt-4 text-sm text-ink-2">
            Already have an account?{' '}
            <Link href="/login" className={`rounded font-semibold text-sprout-deep hover:underline ${focus}`}>
              Log in
            </Link>
          </p>
          <p className="mt-1.5 text-xs text-ink-3">
            Invite never arrived? Joining the list again will get you a fresh one.
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
