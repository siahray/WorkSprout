import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { FeedbackActions } from '@/app/admin/feedback-actions'
import { formatDateTime } from '@/lib/format'
import { card, focus } from '@/lib/ui'
import type { FeedbackRow } from '@/app/admin/types'

export const metadata: Metadata = {
  title: 'Feedback · WorkSprout Admin',
}

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'resolved', label: 'Resolved' },
]

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    new: 'bg-[#F4B63F]/30 text-[#8a5a00]',
    read: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
    resolved: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${tones[status] ?? tones.read}`}>
      {status}
    </span>
  )
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (claimsData?.claims?.app_metadata?.role !== 'admin') redirect('/admin/login')

  const status = FILTERS.some((f) => f.value === params.status) ? (params.status as string) : 'all'

  let query = supabase
    .from('feedback')
    .select('id, user_id, email, message, page, status, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load feedback: ${error.message}`)

  const feedback = (data ?? []) as FeedbackRow[]

  return (
    <>
      <PageHeader title="Feedback" description="What beta testers are telling us, newest first." />

      <div className="mb-4 flex flex-wrap gap-1">
        {FILTERS.map((filter) => {
          const active = filter.value === status
          return (
            <a
              key={filter.value}
              href={filter.value === 'all' ? '/admin/feedback' : `/admin/feedback?status=${filter.value}`}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${focus} ${
                active
                  ? 'bg-[#0E2F27] text-white'
                  : 'text-[#0E2F27]/65 hover:bg-[#0E2F27]/5 hover:text-[#0E2F27]'
              }`}
            >
              {filter.label}
            </a>
          )
        })}
      </div>

      {feedback.length === 0 ? (
        <div className={`${card} px-6 py-16 text-center text-[#0E2F27]/60`}>No feedback here yet.</div>
      ) : (
        <ul className="space-y-3">
          {feedback.map((item) => (
            <li key={item.id} className={`${card} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.status} />
                    <span className="text-sm font-semibold">{item.email ?? 'Anonymous'}</span>
                    {item.page && (
                      <span className="rounded-full bg-[#F4F8F5] px-2 py-0.5 text-xs text-[#0E2F27]/60">
                        {item.page}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#0E2F27]/85">
                    {item.message}
                  </p>
                  <p className="mt-2 text-xs text-[#0E2F27]/45">{formatDateTime(item.created_at)}</p>
                </div>
                <FeedbackActions id={item.id} status={item.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
