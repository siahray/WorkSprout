import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { FeedbackForm } from './feedback-form'
import { card } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Feedback · WorkSprout',
}

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')

  return (
    <>
      <PageHeader
        title="Send feedback"
        description="Bugs, ideas, or a thumbs-up — tell us what would make WorkSprout better."
      />
      <div className={`${card} max-w-2xl p-8 sm:p-10`}>
        <FeedbackForm page="/feedback" email={data.claims?.email} />
      </div>
    </>
  )
}
