import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, nowDateInput } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { btnSecondary, card, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'
import { Calendar, type CalendarCell } from './calendar'
import { TodoForm } from './todo-form'
import { TodoItem, type TodoItemData } from './todo-item'
import { createTodo, deleteTodo, toggleTodo } from './actions'

export const metadata: Metadata = {
  title: 'Focus · WorkSprout',
}

const MONTH_RE = /^(\d{4})-(\d{2})$/
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(dt: Date): string {
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

function addDaysIso(iso: string, days: number): string {
  const dt = new Date(`${iso}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + days)
  return isoDate(dt)
}

function monthParts(ym: string): [number, number] {
  const match = MONTH_RE.exec(ym)!
  return [Number(match[1]), Number(match[2])]
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function monthLabel(y: number, m: number): string {
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function shiftMonth(ym: string, delta: number): string {
  const [y, m] = monthParts(ym)
  return isoDate(new Date(Date.UTC(y, m - 1 + delta, 1))).slice(0, 7)
}

function relativeDay(dayIso: string, todayIso: string): string {
  if (dayIso === todayIso) return 'Today'
  if (dayIso === addDaysIso(todayIso, 1)) return 'Tomorrow'
  if (dayIso === addDaysIso(todayIso, -1)) return 'Yesterday'
  return ''
}

function summarize(rows: { due_date: string; completed_at: string | null }[]): Map<string, { total: number; done: number }> {
  const stats = new Map<string, { total: number; done: number }>()
  for (const row of rows) {
    const s = stats.get(row.due_date) ?? { total: 0, done: 0 }
    s.total += 1
    if (row.completed_at) s.done += 1
    stats.set(row.due_date, s)
  }
  return stats
}

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string }>
}) {
  const params = await searchParams
  const todayIso = nowDateInput()

  let monthIso = todayIso.slice(0, 7)
  if (params.month && MONTH_RE.test(params.month)) {
    const [, m] = monthParts(params.month)
    if (m >= 1 && m <= 12) monthIso = params.month
  }

  let dayIso = todayIso
  if (params.day && DAY_RE.test(params.day)) {
    dayIso = params.day
  } else if (todayIso.slice(0, 7) !== monthIso) {
    dayIso = `${monthIso}-01`
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')
  const userId = claimsData.claims.sub

  const [y, m] = monthParts(monthIso)
  const monthStartIso = `${monthIso}-01`
  const monthEndIso = `${monthIso}-${pad(daysInMonth(y, m))}`
  const historyStartIso = addDaysIso(todayIso, -366)

  const [monthRes, dayRes, historyRes, projectsRes] = await Promise.all([
    supabase
      .from('todos')
      .select('due_date, completed_at')
      .eq('user_id', userId)
      .gte('due_date', monthStartIso)
      .lte('due_date', monthEndIso),
    supabase
      .from('todos')
      .select('id, title, completed_at, project:projects(id, name)')
      .eq('user_id', userId)
      .eq('due_date', dayIso)
      .order('created_at', { ascending: true }),
    supabase
      .from('todos')
      .select('due_date, completed_at')
      .eq('user_id', userId)
      .gte('due_date', historyStartIso)
      .lte('due_date', todayIso),
    supabase.from('projects').select('id, name').order('name', { ascending: true }),
  ])

  // --- Calendar grid (Sunday-first) with per-day achievement dots.
  const cells: (CalendarCell | null)[] = []
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  for (let i = 0; i < lead; i += 1) cells.push(null)
  for (let d = 1; d <= daysInMonth(y, m); d += 1) {
    const iso = `${monthIso}-${pad(d)}`
    cells.push({ day: d, iso, href: `/focus?month=${monthIso}&day=${iso}`, status: 'none', isToday: iso === todayIso })
  }

  const monthStats = summarize((monthRes.data ?? []) as { due_date: string; completed_at: string | null }[])
  for (const cell of cells) {
    if (!cell) continue
    const s = monthStats.get(cell.iso)
    if (s) cell.status = s.total === s.done ? 'won' : 'partial'
  }

  // --- Streaks from up to a year of history (a day is won when all its to-dos are done).
  const historyStats = summarize((historyRes.data ?? []) as { due_date: string; completed_at: string | null }[])
  const wonDates = new Set<string>()
  for (const [date, s] of historyStats) {
    if (s.total > 0 && s.total === s.done) wonDates.add(date)
  }

  const streakAnchor = wonDates.has(todayIso) ? todayIso : addDaysIso(todayIso, -1)
  let currentStreak = 0
  for (let cursor = streakAnchor; wonDates.has(cursor); cursor = addDaysIso(cursor, -1)) currentStreak += 1

  let bestStreak = 0
  let run = 0
  let previous: string | null = null
  for (const date of [...wonDates].sort()) {
    run = previous && addDaysIso(previous, 1) === date ? run + 1 : 1
    if (run > bestStreak) bestStreak = run
    previous = date
  }

  let wonThisMonth = 0
  for (const date of wonDates) {
    if (date >= monthStartIso && date <= monthEndIso) wonThisMonth += 1
  }

  // --- Selected day's list.
  const dayRows = (dayRes.data ?? []) as unknown as TodoItemData[]
  const dayTotal = dayRows.length
  const dayDone = dayRows.filter((row) => row.completed_at).length
  const dayWon = dayTotal > 0 && dayDone === dayTotal
  const donePercent = dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : 0

  const projects = projectsRes.data ?? []
  const dayParam = params.day && DAY_RE.test(params.day) ? `&day=${params.day}` : ''
  const prevHref = `/focus?month=${shiftMonth(monthIso, -1)}${dayParam}`
  const nextHref = `/focus?month=${shiftMonth(monthIso, 1)}${dayParam}`
  const relative = relativeDay(dayIso, todayIso)

  return (
    <>
      <PageHeader title="Focus" description="Plan your day, check off your to-dos, and keep your streak alive.">
        <Link href="/focus" className={`${btnSecondary} ${focus}`}>
          Today
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className={`${card} p-5`}>
              <p className="text-xs font-medium uppercase tracking-wide text-[#0E2F27]/50">Current streak</p>
              <p className={`${display.className} mt-1 text-2xl font-bold tabular-nums`}>
                {currentStreak > 0 ? `${currentStreak} day${currentStreak === 1 ? '' : 's'}` : '—'}
              </p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-xs font-medium uppercase tracking-wide text-[#0E2F27]/50">Best streak</p>
              <p className={`${display.className} mt-1 text-2xl font-bold tabular-nums`}>
                {bestStreak > 0 ? `${bestStreak} day${bestStreak === 1 ? '' : 's'}` : '—'}
              </p>
            </div>
            <div className={`${card} p-5`}>
              <p className="text-xs font-medium uppercase tracking-wide text-[#0E2F27]/50">Days won</p>
              <p className={`${display.className} mt-1 text-2xl font-bold tabular-nums`}>{wonThisMonth}</p>
              <p className="text-xs text-[#0E2F27]/50">this month</p>
            </div>
          </div>

          <Calendar label={monthLabel(y, m)} prevHref={prevHref} nextHref={nextHref} cells={cells} />
        </div>

        <section className={`${card} self-start p-5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className={`${display.className} text-base font-bold tracking-tight`}>{formatDate(dayIso)}</h2>
              {relative && <p className="text-xs font-medium text-[#2E9E6B]">{relative}</p>}
            </div>
            {dayWon && (
              <span className="rounded-full bg-[#2E9E6B]/12 px-2.5 py-1 text-xs font-semibold text-[#1F6B52]">
                Day won
              </span>
            )}
          </div>

          {dayTotal > 0 && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-[#0E2F27]/10">
                <div className="h-full rounded-full bg-[#2E9E6B] transition-all" style={{ width: `${donePercent}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-[#0E2F27]/55">
                {dayDone} of {dayTotal} done{dayWon ? ' — keep it up!' : ''}
              </p>
            </div>
          )}

          <div className="mt-4">
            <TodoForm key={`${dayIso}:${dayTotal}`} action={createTodo} projects={projects} defaultDate={dayIso} />
          </div>

          {dayRows.length === 0 ? (
            <p className="mt-4 rounded-xl bg-[#F4F8F5] px-4 py-6 text-center text-sm text-[#0E2F27]/55">
              Nothing scheduled for this day. Add your first to-do above.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[#0E2F27]/10">
              {dayRows.map((todo) => (
                <TodoItem key={todo.id} todo={todo} toggleAction={toggleTodo} deleteAction={deleteTodo} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}