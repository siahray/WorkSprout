import type { Metadata } from 'next'
import { JoinForm } from './join-form'
import { body } from '@/lib/fonts'

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
    <div className={`${body.className} min-h-screen bg-[#F4F8F5] px-6 py-10 text-[#0E2F27]`}>
      <JoinForm initialEmail={email} source={source} />
    </div>
  )
}
