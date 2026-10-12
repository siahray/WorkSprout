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
        description="Found a bug or have an idea? We read every message during the beta."
      />
      <div className={`${card} max-w-2xl p-6`}>
        <FeedbackForm page="/feedback" />
      </div>
    </>
  )
}
