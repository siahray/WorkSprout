import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth-shell'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Reset your password · WorkSprout',
  robots: { index: false, follow: false },
}

// `expired=1` is set by the callback route when a recovery link was bad or
// already used, so the user lands here knowing to request a fresh one.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const expired = params.expired === '1'

  return (
    <AuthShell
      heading="Forgot your password?"
      text="Happens to the best of us. We&rsquo;ll email you a link to set a new one."
    >
      <ForgotPasswordForm expired={expired} />
    </AuthShell>
  )
}
