import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, nowDateInput } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { btnSecondary, card, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'
import { Calendar, type CalendarCell } from './calendar'
import { FocusTabs } from './focus-tabs'
import { TodoForm } from './todo-form'
import { TodoItem, type TodoItemData } from './todo-item'
import { SubtaskStatusSelect, TaskStatusSelect } from '../projects/task-controls'
import { AddToTodayButton } from './add-to-today'
import { createTodo, deleteTodo, toggleTodo } from './actions'

export const metadata: Metadata = {
  title: 'Focus · WorkSprout',
}

const MONTH_RE = /^(\d{4})-(\d{2})$/
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

type DeliverableTask = { id: string; title: string; status: string | null; project_id: string; phase_id: string | null }
type DeliverableSubtask = { id: string; title: string; status: string | null; project_id: string; parent_task_id: string }

function DeliverableTaskItem({
  task,
  subtasks,
  todayIso,
}: {
  task: DeliverableTask
  subtasks: DeliverableSubtask[]
  todayIso: string
}) {
  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            task.status === 'done' ? 'text-[#0E2F27]/45 line-through' : 'text-[#0E2F27]'
          }`}
        >
          {task.title}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <TaskStatusSelect id={task.id} status={task.status ?? 'todo'} />
        </span>
      </div>

      {subtasks.length > 0 && (
        <ul className="mt-2 space-y-1.5 border-l-2 border-[#0E2F27]/10 pl-4">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center justify-between gap-3">
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  subtask.status === 'done' ? 'text-[#0E2F27]/45 line-through' : 'text-[#0E2F27]/80'
                }`}
              >
                {subtask.title}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <AddToTodayButton title={subtask.title} projectId={subtask.project_id} dueDate={todayIso} />
                <SubtaskStatusSelect id={subtask.id} status={subtask.status ?? 'todo'} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

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

function FocusStat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">{label}</p>
      <p className={`${display.className} mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums`}>{value}</p>
      {hint && <p className="text-xs text-[#0E2F27]/50">{hint}</p>}
    </div>
  )
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

  const [monthRes, dayRes, historyRes, projectsRes, phasesRes, tasksRes, subtasksRes] = await Promise.all([
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
    supabase
      .from('phases')
      .select('id, title, position, project_id')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, title, status, project_id, phase_id')
      .order('created_at', { ascending: true }),
    supabase
      .from('subtasks')
      .select('id, title, status, project_id, parent_task_id')
      .order('created_at', { ascending: true }),
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
  const phases = phasesRes.data ?? []
  const tasks = (tasksRes.data ?? []) as DeliverableTask[]
  const subtasks = (subtasksRes.data ?? []) as DeliverableSubtask[]
  const subtasksByTask = new Map<string, DeliverableSubtask[]>()
  for (const subtask of subtasks) {
    const list = subtasksByTask.get(subtask.parent_task_id) ?? []
    list.push(subtask)
    subtasksByTask.set(subtask.parent_task_id, list)
  }
  const phasesByProject = new Map<string, typeof phases>()
  for (const phase of phases) {
    const list = phasesByProject.get(phase.project_id) ?? []
    list.push(phase)
    phasesByProject.set(phase.project_id, list)
  }
  const tasksByProject = new Map<string, DeliverableTask[]>()
  for (const task of tasks) {
    const list = tasksByProject.get(task.project_id) ?? []
    list.push(task)
    tasksByProject.set(task.project_id, list)
  }
  const deliverableCount = tasks.length + subtasks.length
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

      <FocusTabs
        dayTotal={dayTotal}
        deliverableCount={deliverableCount}
        stats={
          <div className="grid gap-4 sm:grid-cols-3">
            <FocusStat
              label="Current streak"
              value={currentStreak > 0 ? `${currentStreak} day${currentStreak === 1 ? '' : 's'}` : '—'}
              accent="bg-[#2E9E6B]"
            />
            <FocusStat
              label="Best streak"
              value={bestStreak > 0 ? `${bestStreak} day${bestStreak === 1 ? '' : 's'}` : '—'}
              accent="bg-[#F4B63F]"
            />
            <FocusStat label="Days won" value={String(wonThisMonth)} hint="this month" accent="bg-[#0E2F27]/25" />
          </div>
        }
        calendar={<Calendar label={monthLabel(y, m)} prevHref={prevHref} nextHref={nextHref} cells={cells} />}
        todoSidebar={
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
          </section>
        }
        todoList={
          dayRows.length === 0 ? (
            <p className="rounded-xl bg-[#F4F8F5] px-4 py-6 text-center text-sm text-[#0E2F27]/55">
              Nothing scheduled for this day. Add your first to-do beside the calendar.
            </p>
          ) : (
            <ul className={`${card} divide-y divide-[#0E2F27]/10 px-5`}>
              {dayRows.map((todo) => (
                <TodoItem key={todo.id} todo={todo} toggleAction={toggleTodo} deleteAction={deleteTodo} />
              ))}
            </ul>
          )
        }
        deliverablesList={
          deliverableCount === 0 ? (
            <p className={`${card} px-4 py-10 text-center text-sm text-[#0E2F27]/55`}>
              No project deliverables yet. Add tasks inside a project and they will show up here.
            </p>
          ) : (
            <section className={`${card} p-5`}>
              <div className="space-y-6">
                {projects.map((project) => {
                  const projectTasks = tasksByProject.get(project.id)
                  if (!projectTasks || projectTasks.length === 0) return null
                  const projectPhases = phasesByProject.get(project.id) ?? []
                  const unassigned = projectTasks.filter((task) => !task.phase_id)
                  return (
                    <div key={project.id}>
                      <h2 className={`${display.className} text-base font-bold tracking-tight text-[#0E2F27]`}>
                        {project.name}
                      </h2>
                      <div className="mt-3 space-y-4">
                        {projectPhases.map((phase) => {
                          const phaseTasks = projectTasks.filter((task) => task.phase_id === phase.id)
                          if (phaseTasks.length === 0) return null
                          return (
                            <div key={phase.id}>
                              <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0E2F27]">
                                {phase.title}
                                <span className="rounded-full bg-[#F4F8F5] px-2 py-0.5 text-xs font-medium text-[#0E2F27]/55">
                                  {phaseTasks.length}
                                </span>
                              </h3>
                              <ul className="mt-2 divide-y divide-[#0E2F27]/10 overflow-hidden rounded-xl border border-[#0E2F27]/10">
                                {phaseTasks.map((task) => (
                                  <DeliverableTaskItem
                                    key={task.id}
                                    task={task}
                                    subtasks={subtasksByTask.get(task.id) ?? []}
                                    todayIso={todayIso}
                                  />
                                ))}
                              </ul>
                            </div>
                          )
                        })}

                        {unassigned.length > 0 && (
                          <div>
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#0E2F27]/70">
                              Unassigned
                              <span className="rounded-full bg-[#F4F8F5] px-2 py-0.5 text-xs font-medium text-[#0E2F27]/55">
                                {unassigned.length}
                              </span>
                            </h3>
                            <ul className="mt-2 divide-y divide-[#0E2F27]/10 overflow-hidden rounded-xl border border-[#0E2F27]/10">
                              {unassigned.map((task) => (
                                <DeliverableTaskItem
                                  key={task.id}
                                  task={task}
                                  subtasks={subtasksByTask.get(task.id) ?? []}
                                  todayIso={todayIso}
                                />
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        }
      />
    </>
  )
}