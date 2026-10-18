import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { AuthShell } from '@/components/auth-shell'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Choose a new password · WorkSprout',
  robots: { index: false, follow: false },
}

// The emailed recovery link lands here via /auth/callback, which exchanges its
// code for a session. Without that session there is nothing for updateUser to
// act on, so a direct visit shows a way forward instead of a failing form.
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  return (
    <AuthShell
      heading="Pick something strong."
      text="You&rsquo;re verified. Choose the new password you&rsquo;ll use from now on."
    >
      {signedIn ? (
        <ResetPasswordForm />
      ) : (
        <div className="mx-auto w-full max-w-md px-6">
          <div className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 text-center shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]">
            <h1 className="text-2xl font-extrabold tracking-tight">This link has expired</h1>
            <p className="mt-2 text-[#0E2F27]/65">
              Reset links work once and don&rsquo;t last forever. Request a fresh one and we&rsquo;ll email it over.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#F4B63F] px-5 py-3.5 text-base font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]"
            >
              Send a new link
            </Link>
          </div>
        </div>
      )}
    </AuthShell>
  )
}
