import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { callJoinUrl, callWhen, snapshotFromPublicCall } from '@/lib/call'
import { isUuid } from '@/lib/validation'
import { btnPrimary, btnSecondary, card, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Call · WorkSprout',
  robots: { index: false, follow: false },
}

// Read-only call details, reachable by anyone holding the share token.
export default async function PublicCallPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isUuid(token)) notFound()

  const supabase = await createClient()
  const { data } = await supabase.rpc('call_public', { p_token: token })
  const call = snapshotFromPublicCall(data)
  if (!call) notFound()

  const join = callJoinUrl(call.location)
  const cancelled = call.status === 'cancelled'

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10 sm:py-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sprout" aria-hidden="true" />
          <span className={`${display.className} text-sm font-extrabold tracking-tight text-ink`}>WorkSprout</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <a href={`/c/${token}/ics`} className={`${btnSecondary} ${focus}`}>
            Add to calendar
          </a>
          {join && (
            <a href={join} target="_blank" rel="noreferrer" className={`${btnPrimary} ${focus}`}>
              Join call
            </a>
          )}
        </div>
      </header>

      <article className={`${card} p-8`}>
        <p className="text-meta font-medium text-ink-3">
          {cancelled ? 'Cancelled call' : 'Scheduled call'}
        </p>
        <h1
          className={`${display.className} mt-1 text-2xl font-extrabold tracking-tight ${
            cancelled ? 'text-ink-3 line-through' : ''
          }`}
        >
          {call.title}
        </h1>
        <p className="mt-2 text-sm text-ink-2">{callWhen(call.scheduledAt, call.durationMinutes)}</p>

        <dl className="mt-6 divide-y divide-line border-t border-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-ink-2">Duration</dt>
            <dd className="font-medium">{call.durationMinutes} minutes</dd>
          </div>
          {call.client?.name && (
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-ink-2">With</dt>
              <dd className="font-medium">
                {call.client.name}
                {call.client.company ? ` · ${call.client.company}` : ''}
              </dd>
            </div>
          )}
          {call.location && (
            <div className="flex justify-between gap-6 py-3">
              <dt className="text-ink-2">Where</dt>
              <dd className="min-w-0 max-w-[60%] break-words text-right font-medium">
                {join ? (
                  <a href={join} target="_blank" rel="noreferrer" className="text-sprout-deep underline-offset-2 hover:underline">
                    Join online
                  </a>
                ) : (
                  call.location
                )}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-ink-2">Host</dt>
            <dd className="font-medium">{call.business.name}</dd>
          </div>
        </dl>

        {call.notes && (
          <div className="mt-6 border-t border-line pt-4 text-sm text-ink-2">
            <p className="font-semibold text-ink-2">Agenda</p>
            <p className="mt-1 whitespace-pre-line">{call.notes}</p>
          </div>
        )}
      </article>

      <p className="mt-6 text-center text-xs text-ink-3">
        Shared by {call.business.name} · Powered by WorkSprout
      </p>
    </main>
  )
}
