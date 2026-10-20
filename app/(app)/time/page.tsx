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
import { formatDate, hoursFromMinutes, nowDateInput } from '@/lib/format'
import {
  addDays,
  addMonths,
  monthKey,
  monthLabel,
  resolvePeriodRange,
  type PeriodKind,
} from '@/lib/period'
import { buildTimesheet } from '@/lib/reports'
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

type MatrixEntry = {
  start_time: string
  duration_minutes: number | null
  billable: boolean
  task: { project: { name: string } | null } | null
}

/** Link to the Time page carrying view, filter, and period — never a page number. */
function timeHref(opts: {
  view: 'list' | 'timesheet'
  project?: string | null
  period?: PeriodKind
  start?: string
}): string {
  const search = new URLSearchParams()
  if (opts.project) search.set('project', opts.project)
  if (opts.view === 'timesheet') {
    search.set('view', 'timesheet')
    search.set('period', opts.period ?? 'week')
    if (opts.start) search.set('start', opts.start)
  }
  const query = search.toString()
  return query ? `/time?${query}` : '/time'
}

/** Matrix cells read as hours: `1.5`, `0.75`, `2` — never a bare `0`. */
function cellHours(minutes: number): string {
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(2)
}

/** `Mon 19` for a matrix column head, built from the date's own parts. */
function dayLabel(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString('en-PH', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <p className="text-meta font-medium text-ink-3">{label}</p>
      <p className={`${display.className} mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-ink-3">{hint}</p>}
    </div>
  )
}

export default async function TimePage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; page?: string; view?: string; period?: string; start?: string }>
}) {
  const {
    project: projectFilter,
    page: rawPage,
    view: rawView,
    period: rawPeriod,
    start: rawStart,
  } = await searchParams
  const page = parsePage(rawPage)
  const { from, to } = pageRange(page)
  // A malformed ?project= (not even a UUID) counts as no filter rather than
  // being handed to PostgREST, which would reject the cast with a 400.
  const projectParam = projectFilter && isUuid(projectFilter) ? projectFilter : null
  const isTimesheet = rawView === 'timesheet'
  const period: PeriodKind = rawPeriod === 'month' ? 'month' : 'week'
  const today = nowDateInput()
  // Missing, malformed, or future ?start= collapses to the current period.
  const range = resolvePeriodRange(period, rawStart, today)
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const options = await loadProjectOptions(supabase)

  // The list pages through every entry (with a count for pagination); the
  // timesheet pulls one bounded period oldest-first so the matrix columns
  // line up. The project filter applies to both — inside the query, because
  // PostgREST only filters on an embedded column with !inner.
  const entriesSource = (() => {
    if (isTimesheet) {
      const query = supabase
        .from('time_entries')
        .select(
          projectParam
            ? 'start_time, duration_minutes, billable, task:tasks!inner(project:projects(name))'
            : 'start_time, duration_minutes, billable, task:tasks(project:projects(name))',
        )
        .not('end_time', 'is', null)
        // Manila day bounds (fixed +08:00): the matrix buckets by the
        // Manila calendar day, so the fetch has to speak the same one.
        .gte('start_time', `${range.from}T00:00:00+08:00`)
        .lt('start_time', `${addDays(range.to, 1)}T00:00:00+08:00`)
        .order('start_time', { ascending: true })
      if (projectParam) query.eq('task.project_id', projectParam)
      return query
    }
    const query = supabase
      .from('time_entries')
      .select(
        projectParam
          ? 'id, task_id, start_time, duration_minutes, billable, invoice_id, task:tasks!inner(project_id)'
          : 'id, task_id, start_time, duration_minutes, billable, invoice_id',
        { count: 'exact' },
      )
      .not('end_time', 'is', null)
    if (projectParam) query.eq('task.project_id', projectParam)
    return query.order('start_time', { ascending: false }).range(from, to)
  })()

  const [activeRes, entriesRes, totalsRes] = await Promise.all([
    supabase
      .from('time_entries')
      .select('id, task_id, start_time, paused_at, paused_seconds')
      .is('end_time', null)
      .maybeSingle(),
    entriesSource,
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

  // The matrix folds the fetched period into project × day minutes.
  const timesheet = isTimesheet
    ? buildTimesheet(
        ((entriesRes.data ?? []) as unknown as MatrixEntry[]).map((entry) => ({
          start_time: entry.start_time,
          duration_minutes: entry.duration_minutes,
          billable: entry.billable,
          project_name: entry.task?.project?.name ?? null,
        })),
        range.from,
        range.to,
      )
    : null
  const exportReady = isTimesheet ? (timesheet?.total ?? 0) > 0 : total > 0
  const nextStart = period === 'week' ? addDays(range.from, 7) : addMonths(range.from, 1)
  // You can browse back through past timesheets, never into next week.
  const canGoNext = nextStart <= resolvePeriodRange(period, undefined, today).from
  const shiftStart = (direction: -1 | 1) =>
    period === 'week'
      ? addDays(range.from, 7 * direction)
      : addMonths(range.from, direction)

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
        <div className="mb-6 -mx-2 sm:mx-0">
          <RunningTimerCard active={active} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Unbilled"
          value={hoursFromMinutes(unbilledMinutes)}
          hint="Billable, not yet invoiced"
          accent="bg-mango"
        />
        <Stat
          label="Logged"
          value={hoursFromMinutes(totalMinutes)}
          hint={filterName ? `For ${filterName}` : 'All time'}
          accent="bg-sprout"
        />
        <Stat
          label="Entries"
          value={String(totals.entries ?? 0)}
          hint={filterName ? `For ${filterName}` : 'Total time entries'}
          accent="bg-ink/10"
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className={`${display.className} text-xl font-extrabold tracking-tight`}>
            {isTimesheet
              ? period === 'week'
                ? `${formatDate(range.from)} – ${formatDate(range.to)}`
                : monthLabel(monthKey(range.from))
              : filterName
                ? `Time for ${filterName}`
                : 'Recent time'}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-control border border-line p-0.5 text-xs font-semibold">
              <Link
                href={timeHref({ view: 'list', project: projectParam })}
                className={`rounded-control px-3 py-1.5 ${!isTimesheet ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'} ${focus}`}
              >
                List
              </Link>
              <Link
                href={timeHref({ view: 'timesheet', project: projectParam, period, start: range.from })}
                className={`rounded-control px-3 py-1.5 ${isTimesheet ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'} ${focus}`}
              >
                Timesheet
              </Link>
            </div>
            {exportReady && (
              <Link
                href={
                  isTimesheet
                    ? `/time/export?view=timesheet&period=${period}&start=${range.from}${projectParam ? `&project=${projectParam}` : ''}`
                    : `/time/export${projectParam ? `?project=${projectParam}` : ''}`
                }
                className={`${btnGhost} px-3! py-1.5! text-xs ${focus}`}
              >
                Export CSV
              </Link>
            )}
          </div>
        </div>
        {isTimesheet ? (
          timesheet && timesheet.rows.length > 0 ? (
            <div className={`${card} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={timeHref({ view: 'timesheet', project: projectParam, period, start: shiftStart(-1) })}
                    aria-label={`Previous ${period === 'week' ? 'week' : 'month'}`}
                    className={`${btnGhost} px-2.5! py-1.5! text-xs ${focus}`}
                  >
                    ←
                  </Link>
                  {canGoNext && (
                    <Link
                      href={timeHref({ view: 'timesheet', project: projectParam, period, start: shiftStart(1) })}
                      aria-label={`Next ${period === 'week' ? 'week' : 'month'}`}
                      className={`${btnGhost} px-2.5! py-1.5! text-xs ${focus}`}
                    >
                      →
                    </Link>
                  )}
                </div>
                <div className="flex rounded-control border border-line p-0.5 text-xs font-semibold">
                  <Link
                    href={timeHref({ view: 'timesheet', project: projectParam, period: 'week', start: range.from })}
                    className={`rounded-control px-3 py-1.5 ${period === 'week' ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'} ${focus}`}
                  >
                    Week
                  </Link>
                  <Link
                    href={timeHref({ view: 'timesheet', project: projectParam, period: 'month', start: range.from })}
                    className={`rounded-control px-3 py-1.5 ${period === 'month' ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink'} ${focus}`}
                  >
                    Month
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Project</th>
                      {timesheet.days.map((day) => (
                        <th key={day} className={`${th} text-right`}>
                          {dayLabel(day)}
                        </th>
                      ))}
                      <th className={`${th} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {timesheet.rows.map((row) => (
                      <tr key={row.key} className={rowHover}>
                        <td className="px-5 py-2.5 font-medium whitespace-nowrap">{row.label}</td>
                        {row.cells.map((minutes, index) => (
                          <td
                            key={timesheet.days[index]}
                            className={`px-3 py-2.5 text-right tabular-nums ${minutes ? '' : 'text-ink-4'}`}
                          >
                            {minutes ? cellHours(minutes) : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          {cellHours(row.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-canvas">
                      <th className="px-5 py-2.5 text-left text-meta font-medium text-ink-3">
                        Total
                      </th>
                      {timesheet.dayTotals.map((minutes, index) => (
                        <td key={timesheet.days[index]} className="px-3 py-2.5 text-right font-semibold tabular-nums">
                          {cellHours(minutes)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">
                        {cellHours(timesheet.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-ink-3">
                <span>
                  {hoursFromMinutes(timesheet.billableMinutes)} billable ·{' '}
                  {hoursFromMinutes(timesheet.total - timesheet.billableMinutes)} not billable
                </span>
                {filterName && <span>Filtered to {filterName}</span>}
              </div>
            </div>
          ) : (
            <div className={`${card} p-8 text-center text-sm text-ink-2`}>
              No time logged in this period. Use the arrows to browse back, or log an entry above.
            </div>
          )
        ) : total === 0 ? (
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
                <tbody className="divide-y divide-line">
                  {entries.map((entry) => {
                    const info = taskInfo.get(entry.task_id)
                    return (
                      <tr key={entry.id} className={rowHover}>
                        <td className="px-5 py-3 whitespace-nowrap text-ink-2">{formatDate(entry.start_time)}</td>
                        <td className="px-5 py-3">
                          <span className="font-medium">{info?.title ?? '—'}</span>
                          {info && <p className="text-xs text-ink-3">{info.projectName}</p>}
                        </td>
                        <td className="px-5 py-3 tabular-nums">{hoursFromMinutes(entry.duration_minutes)}</td>
                        <td className="px-5 py-3">
                          {entry.invoice_id ? (
                            <span className="text-sprout-deep">Invoiced</span>
                          ) : entry.billable ? (
                            <span className="text-mango-deep">Unbilled</span>
                          ) : (
                            <span className="text-ink-3">Not billable</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {entry.invoice_id === null && (
                            <span className="flex items-center justify-end gap-1">
                              <Link href={`/time/${entry.id}/edit`} className={`${btnGhost} px-2! py-1! text-xs`}>
                                Edit
                              </Link>
                              <ConfirmAction
                                action={deleteTimeEntry}
                                id={entry.id}
                                message="Delete this time entry?"
                                className={`${btnGhost} px-2! py-1! text-xs text-danger hover:bg-danger-wash`}
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
