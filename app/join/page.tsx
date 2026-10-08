import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth-shell'
import { JoinForm } from './join-form'

export const metadata: Metadata = {
  title: 'Join the beta · WorkSprout',
  robots: { index: false, follow: false },
}

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''
  const source = typeof params.source === 'string' ? params.source : 'beta-landing'

  return (
    <AuthShell
      heading="Grow your freelance business with us."
      text="Join the free beta and we'll email you when your invite is ready."
    >
      <JoinForm initialEmail={email} source={source} />
    </AuthShell>
  )
}