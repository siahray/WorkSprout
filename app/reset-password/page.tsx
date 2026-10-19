import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { AuthShell } from '@/components/auth-shell'
import { LinkExpiredCard } from '@/components/link-expired-card'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Choose a new password · WorkSprout',
  robots: { index: false, follow: false },
}

// The emailed recovery link lands here via /auth/confirm, which turns its
// one-time token into a session. Without that session there is nothing for
// updateUser to act on, so a direct visit (or a link that was already used)
// shows a way forward instead of a failing form.
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)

  return (
    <AuthShell
      heading="Pick something strong."
      text="You&rsquo;re verified. Choose the new password you&rsquo;ll use from now on."
    >
      {signedIn ? <ResetPasswordForm /> : <LinkExpiredCard />}
    </AuthShell>
  )
}
