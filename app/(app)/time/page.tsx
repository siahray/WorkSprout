import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { Pagination } from '@/components/ui/pagination'
import { RunningTimerCard, type ActiveTimer } from './timer-controls'
import { TrackPanel } from './track-panel'
import { loadProjectOptions } from './data'
import { addManualEntry, deleteTimeEntry } from './actions'
import { clampedPage, pageCount, pageRange, parsePage, listHref } from '@/lib/pagination'
import { isUuid } from '@/lib/validation'
import { formatDate, hoursFromMinutes } from '@/lib/format'
import { btnGhost, btnSecondary, card, focus, tableHead, th, rowHover } from '@/lib/ui'
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

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">{label}</p>
      <p className={`${display.className} mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-[#0E2F27]/55">{hint}</p>}
    </div>
  )
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; page?: string }>
}) {
  const { project: projectFilter, page: rawPage } = await searchParams
  const page = parsePage(rawPage)
  const { from, to } = pageRange(page)
  // A malformed ?project= (not even a UUID) counts as no filter rather than
  // being handed to PostgREST, which would reject the cast with a 400.
  const projectParam = projectFilter && isUuid(projectFilter) ? projectFilter : null
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const options = await loadProjectOptions(supabase)

  const entriesQuery = supabase
    .from('time_entries')
    .select(
      projectParam
        ? 'id, task_id, start_time, duration_minutes, billable, invoice_id, task:tasks!inner(project_id)'
        : 'id, task_id, start_time, duration_minutes, billable, invoice_id',
      { count: 'exact' },
    )
    .not('end_time', 'is', null)
  // The project filter moved into the query: this page used to fetch every
  // entry and filter in memory, which pagination (and the stats below) can't
  // afford to do anymore.
  if (projectParam) entriesQuery.eq('task.project_id', projectParam)

  const [activeRes, entriesRes, totalsRes] = await Promise.all([
    supabase
      .from('time_entries')
      .select('id, task_id, start_time, paused_at, paused_seconds')
      .is('end_time', null)
      .maybeSingle(),
    entriesQuery.order('start_time', { ascending: false }).range(from, to),
    // Summed in the database under the caller's own RLS — the page only ever
    // sees one 50-row slice, but "Unbilled" and "Logged" stay workspace-wide
    // (or project-wide, the way the table itself is filtered).
    supabase.rpc('time_totals', { p_project: projectParam }),
  ])

  // Routed through `unknown`: the type-level select parser rejects the
  // `!inner` embedded join even though the query itself is valid (the
  // expenses page does the same for its embedded project join).
  const entries = (entriesRes.data ?? []) as unknown as EntryRow[]

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

  const total = entriesRes.count ?? 0
  const pages = pageCount(total)
  // ?page=999 on a 3-page list lands on page 3 instead of an empty table.
  if (total > 0 && page > pages) {
    redirect(listHref('/time', { project: projectParam ?? undefined }, clampedPage(page, pages)))
  }

  const totals = (totalsRes.data ?? {}) as {
    unbilled_minutes?: number | string
    total_minutes?: number | string
    entries?: number
  }
  const unbilledMinutes = Number(totals.unbilled_minutes ?? 0)
  const totalMinutes = Number(totals.total_minutes ?? 0)
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Unbilled"
          value={hoursFromMinutes(unbilledMinutes)}
          hint="Billable, not yet invoiced"
          accent="bg-[#F4B63F]"
        />
        <Stat
          label="Logged"
          value={hoursFromMinutes(totalMinutes)}
          hint={filterName ? `For ${filterName}` : 'All time'}
          accent="bg-[#2E9E6B]"
        />
        <Stat
          label="Entries"
          value={String(totals.entries ?? 0)}
          hint={filterName ? `For ${filterName}` : 'Total time entries'}
          accent="bg-[#0E2F27]/10"
        />
      </div>

      <div className="mt-6">
        <TrackPanel
          projects={options}
          initialProjectId={projectParam ?? undefined}
          hasRunning={Boolean(active)}
          manualAction={addManualEntry}
        />
      </div>

      <section className="mt-8">
        <h2 className={`${display.className} mb-3 text-xl font-extrabold tracking-tight`}>
          {filterName ? `Time for ${filterName}` : 'Recent time'}
        </h2>
        {total === 0 ? (
          <EmptyState
            title={filterName ? `No time logged for ${filterName}` : 'No time logged yet'}
            description="Start the timer or log an entry by hand and it will show up here."
          />
        ) : (
          <div className={`${card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Task</th>
                    <th className={th}>Duration</th>
                    <th className={th}>Status</th>
                    <th className={th} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E2F27]/10">
                  {entries.map((entry) => {
                    const info = taskInfo.get(entry.task_id)
                    return (
                      <tr key={entry.id} className={rowHover}>
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
            <Pagination
              page={page}
              pages={pages}
              basePath="/time"
              params={{ project: projectParam ?? undefined }}
            />
          </div>
        )}
      </section>
    </>
  )
}
