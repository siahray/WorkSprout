import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { StartTimer, RunningTimerCard, type ActiveTimer } from './timer-controls'
import { TimeEntryForm } from './entry-form'
import { loadProjectOptions } from './data'
import { addManualEntry, deleteTimeEntry } from './actions'
import { formatDate, hoursFromMinutes } from '@/lib/format'
import { btnGhost, btnSecondary, card, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Time · WorkSprout',
}

type EntryRow = {
  id: string
  task_id: string
  start_time: string
  duration_minutes: number | null
  billable: boolean
  invoice_id: string | null
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-sm text-[#0E2F27]/60">{label}</p>
      <p className={`${display.className} mt-1 text-2xl font-extrabold tabular-nums`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-[#0E2F27]/55">{hint}</p>}
    </div>
  )
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { project: projectFilter } = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const options = await loadProjectOptions(supabase)

  const [activeRes, entriesRes] = await Promise.all([
    supabase
      .from('time_entries')
      .select('id, task_id, start_time, paused_at, paused_seconds')
      .is('end_time', null)
      .maybeSingle(),
    supabase
      .from('time_entries')
      .select('id, task_id, start_time, duration_minutes, billable, invoice_id')
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false }),
  ])

  const allEntries = (entriesRes.data ?? []) as EntryRow[]

  const taskInfo = new Map<string, { title: string; projectId: string; projectName: string; clientName: string | null }>()
  for (const p of options) {
    for (const t of p.tasks) {
      taskInfo.set(t.id, { title: t.title, projectId: p.id, projectName: p.name, clientName: p.clientName })
    }
  }

  const activeRow = activeRes.data
  const active: ActiveTimer | null = activeRow
    ? {
        id: activeRow.id,
        startTime: activeRow.start_time,
        pausedAt: activeRow.paused_at,
        pausedSeconds: activeRow.paused_seconds ?? 0,
        label: (() => {
          const info = taskInfo.get(activeRow.task_id)
          if (!info) return 'Timer running'
          return `${info.clientName ? `${info.clientName} · ` : ''}${info.projectName} · ${info.title}`
        })(),
      }
    : null

  const filtered = projectFilter
    ? allEntries.filter((e) => taskInfo.get(e.task_id)?.projectId === projectFilter)
    : allEntries

  const unbilledMinutes = filtered
    .filter((e) => e.invoice_id === null && e.billable)
    .reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const totalMinutes = filtered.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const filterName = projectFilter ? options.find((p) => p.id === projectFilter)?.name : null

  return (
    <>
      <PageHeader title="Time" description="Run a live timer or log time by hand.">
        {filterName && (
          <Link href="/time" className={`${btnSecondary} ${focus}`}>
            Clear filter: {filterName}
          </Link>
        )}
      </PageHeader>

      {active && (
        <div className="mb-6">
          <RunningTimerCard active={active} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Unbilled" value={hoursFromMinutes(unbilledMinutes)} hint="Billable, not yet invoiced" />
        <Stat label="Logged" value={hoursFromMinutes(totalMinutes)} hint={filterName ? `For ${filterName}` : 'All time'} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className={`${card} p-5`}>
            <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Start a timer</h2>
            <div className="mt-4">
              <StartTimer projects={options} initialProjectId={projectFilter} hasRunning={Boolean(active)} />
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Log time manually</h2>
            <div className="mt-4">
              <TimeEntryForm action={addManualEntry} projects={options} cancelHref="/time" />
            </div>
          </section>
        </div>

        <section>
          <h2 className={`${display.className} mb-3 text-xl font-extrabold tracking-tight`}>
            {filterName ? `Time for ${filterName}` : 'Recent time'}
          </h2>
          {filtered.length === 0 ? (
            <div className={`${card} p-6 text-sm text-[#0E2F27]/65`}>No time logged yet.</div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F4F8F5] text-left text-[#0E2F27]/60">
                    <tr>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Task</th>
                      <th className="px-5 py-3 font-medium">Duration</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0E2F27]/10">
                    {filtered.slice(0, 50).map((entry) => {
                      const info = taskInfo.get(entry.task_id)
                      return (
                        <tr key={entry.id} className="hover:bg-[#F4F8F5]/60">
                          <td className="px-5 py-3 whitespace-nowrap text-[#0E2F27]/65">{formatDate(entry.start_time)}</td>
                          <td className="px-5 py-3">
                            <span className="font-medium">{info?.title ?? '—'}</span>
                            {info && <p className="text-xs text-[#0E2F27]/55">{info.projectName}</p>}
                          </td>
                          <td className="px-5 py-3 tabular-nums">{hoursFromMinutes(entry.duration_minutes)}</td>
                          <td className="px-5 py-3">
                            {entry.invoice_id ? (
                              <span className="text-[#1F6B52]">Invoiced</span>
                            ) : entry.billable ? (
                              <span className="text-[#8a6412]">Unbilled</span>
                            ) : (
                              <span className="text-[#0E2F27]/55">Not billable</span>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            {entry.invoice_id === null && (
                              <span className="flex items-center justify-end gap-1">
                                <Link href={`/time/${entry.id}/edit`} className={`${btnGhost} !px-2 !py-1 text-xs`}>
                                  Edit
                                </Link>
                                <ConfirmAction
                                  action={deleteTimeEntry}
                                  id={entry.id}
                                  message="Delete this time entry?"
                                  className={`${btnGhost} !px-2 !py-1 text-xs text-red-700 hover:text-red-800`}
                                >
                                  Delete
                                </ConfirmAction>
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
