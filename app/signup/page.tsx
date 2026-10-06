import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthShell } from '@/components/auth-shell'
import { SignupForm } from './signup-form'

export const metadata: Metadata = {
  title: 'Create your account · WorkSprout',
  robots: { index: false, follow: false },
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) redirect('/dashboard')

  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''

  return (
    <AuthShell
      heading="You're in. Let's get your business growing."
      text="Add a client, track your hours, and send your first invoice today."
    >
      <SignupForm initialEmail={email} />
    </AuthShell>
  )
}