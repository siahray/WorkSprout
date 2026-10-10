import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { AddSubtaskForm, AddTaskForm, SubtaskStatusSelect, TaskStatusSelect } from '../task-controls'
import { StartTimer, RunningTimerCard, type ActiveTimer, type ProjectOption } from '@/app/(app)/time/timer-controls'
import { decimalHours, formatDate, hoursFromMinutes, peso } from '@/lib/format'
import { btnPrimary, btnSecondary, btnDanger, card, focus, tableHead, th, rowHover } from '@/lib/ui'
import { deleteProject, deleteSubtask, deleteTask } from '../actions'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Project · WorkSprout',
}

type TaskRow = { id: string; title: string; status: string | null }
type SubtaskRow = { id: string; title: string; status: string | null; parent_task_id: string }
type TimeRow = {
  id: string
  task_id: string
  start_time: string
  end_time: string | null
  paused_at: string | null
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

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data: rawProject } = await supabase
    .from('projects')
    .select('id, name, description, status, hourly_rate, fixed_rate, client:clients(id, name)')
    .eq('id', id)
    .maybeSingle()

  const project = rawProject as unknown as
    | {
        id: string
        name: string
        description: string | null
        status: string | null
        hourly_rate: number | string | null
        fixed_rate: number | string | null
        client: { id: string; name: string } | null
      }
    | null

  if (!project) notFound()

  const [tasksRes, subtasksRes, invoicesRes, activeRes] = await Promise.all([
    supabase.from('tasks').select('id, title, status').eq('project_id', id).order('created_at', { ascending: true }),
    supabase
      .from('subtasks')
      .select('id, title, status, parent_task_id')
      .eq('project_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('invoice_balances')
      .select('id, number, status, total, balance, issue_date')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('time_entries')
      .select(
        'id, start_time, paused_at, paused_seconds, task:tasks(id, project_id, title, project:projects(name, client:clients(name)))'
      )
      .is('end_time', null)
      .maybeSingle(),
  ])

  const tasks = (tasksRes.data ?? []) as TaskRow[]
  const subtasks = (subtasksRes.data ?? []) as SubtaskRow[]
  const invoices = invoicesRes.data ?? []
  const taskIds = tasks.map((t) => t.id)
  const subtasksByTask = new Map<string, SubtaskRow[]>()
  for (const subtask of subtasks) {
    const list = subtasksByTask.get(subtask.parent_task_id) ?? []
    list.push(subtask)
    subtasksByTask.set(subtask.parent_task_id, list)
  }

  const timerOptions: ProjectOption[] = [
    {
      id: project.id,
      name: project.name,
      clientName: project.client?.name ?? null,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title })),
    },
  ]

  const activeRow = activeRes.data as unknown as
    | {
        id: string
        start_time: string
        paused_at: string | null
        paused_seconds: number | null
        task: {
          title: string
          project: { name: string; client: { name: string } | null } | null
        } | null
      }
    | null

  const active: ActiveTimer | null = activeRow
    ? {
        id: activeRow.id,
        startTime: activeRow.start_time,
        pausedAt: activeRow.paused_at,
        pausedSeconds: activeRow.paused_seconds ?? 0,
        label: activeRow.task
          ? `${activeRow.task.project?.client?.name ? `${activeRow.task.project.client.name} · ` : ''}${
              activeRow.task.project?.name ? `${activeRow.task.project.name} · ` : ''
            }${activeRow.task.title}`
          : 'Timer running',
      }
    : null

  const entries: TimeRow[] = taskIds.length
    ? (((await supabase
        .from('time_entries')
        .select('id, task_id, start_time, end_time, paused_at, duration_minutes, billable, invoice_id')
        .in('task_id', taskIds)
        .order('start_time', { ascending: false })).data ?? []) as TimeRow[])
    : []

  const totalMinutes = entries.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const unbilled = entries.filter((e) => e.invoice_id === null && e.billable && e.end_time)
  const unbilledMinutes = unbilled.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
  const hourlyRate = project.hourly_rate != null ? Number(project.hourly_rate) : null
  const fixedRate = project.fixed_rate != null ? Number(project.fixed_rate) : null
  const unbilledValue =
    fixedRate != null
      ? unbilled.length > 0
        ? fixedRate
        : 0
      : hourlyRate != null
        ? decimalHours(unbilledMinutes) * hourlyRate
        : null
  const tasksDone = tasks.filter((t) => t.status === 'done').length

  const unbilledHint = [
    hourlyRate != null ? `At ${peso(hourlyRate)}/hr` : null,
    fixedRate != null ? `Fixed ${peso(fixedRate)}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const taskTitle = new Map(tasks.map((t) => [t.id, t.title]))

  return (
    <>
      <PageHeader title={project.name} description={project.client?.name ?? undefined}>
        <Link href={`/projects/${id}/edit`} className={`${btnSecondary} ${focus}`}>
          Edit
        </Link>
        <Link href={`/time?project=${id}`} className={`${btnSecondary} ${focus}`}>
          Track time
        </Link>
        <Link href={`/invoices/new?project_id=${id}`} className={`${btnPrimary} ${focus}`}>
          New invoice
        </Link>
      </PageHeader>

      {project.description && <p className="mb-6 max-w-3xl whitespace-pre-line text-[#0E2F27]/70">{project.description}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Tracked" value={hoursFromMinutes(totalMinutes)} />
        <Stat label="Unbilled" value={hoursFromMinutes(unbilledMinutes)} hint="Billable hours not yet invoiced" />
        <Stat
          label="Unbilled value"
          value={unbilledValue != null ? peso(unbilledValue) : '—'}
          hint={
            unbilledHint ||
            (hourlyRate == null && fixedRate == null ? 'No rate set on this project.' : undefined)
          }
        />
        <Stat label="Tasks done" value={`${tasksDone}/${tasks.length}`} />
      </div>

      <div className="mt-8 space-y-4">
        {active && <RunningTimerCard active={active} />}
        <section className={`${card} p-5`}>
          <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Start a timer</h2>
          <div className="mt-4">
            <StartTimer
              projects={timerOptions}
              initialProjectId={id}
              hasRunning={Boolean(active)}
              emptyMessage="Add at least one task, then you can start tracking time here."
            />
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className={`${display.className} mb-3 text-xl font-extrabold tracking-tight`}>Tasks</h2>
          <div className="space-y-4">
            <AddTaskForm projectId={id} />
            {tasks.length === 0 ? (
              <div className={`${card} p-6 text-sm text-[#0E2F27]/65`}>
                No tasks yet. Add one above so you can track time against it.
              </div>
            ) : (
              <ul className={`${card} divide-y divide-[#0E2F27]/10`}>
                {tasks.map((t) => {
                  const taskSubtasks = subtasksByTask.get(t.id) ?? []
                  return (
                    <li key={t.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-sm font-medium ${t.status === 'done' ? 'text-[#0E2F27]/45 line-through' : ''}`}>
                          {t.title}
                        </span>
                        <span className="flex items-center gap-2">
                          <TaskStatusSelect id={t.id} status={t.status ?? 'todo'} />
                          <ConfirmAction
                            action={deleteTask}
                            id={t.id}
                            message="Delete this task and all of its tracked time?"
                            className={`${btnDanger} px-2.5 py-1.5 text-xs`}
                          >
                            Delete
                          </ConfirmAction>
                        </span>
                      </div>

                      {taskSubtasks.length > 0 && (
                        <ul className="mt-2 space-y-1.5 border-l-2 border-[#0E2F27]/10 pl-4">
                          {taskSubtasks.map((subtask) => (
                            <li key={subtask.id} className="flex items-center justify-between gap-3">
                              <span
                                className={`min-w-0 flex-1 truncate text-sm ${
                                  subtask.status === 'done' ? 'text-[#0E2F27]/45 line-through' : 'text-[#0E2F27]/80'
                                }`}
                              >
                                {subtask.title}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <SubtaskStatusSelect id={subtask.id} status={subtask.status ?? 'todo'} />
                                <ConfirmAction
                                  action={deleteSubtask}
                                  id={subtask.id}
                                  message="Delete this subtask?"
                                  extra={{ project_id: id }}
                                  className={`${btnDanger} px-2 py-1 text-xs`}
                                >
                                  Delete
                                </ConfirmAction>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-[#1F6B52]">Add subtask</summary>
                        <div className="mt-2">
                          <AddSubtaskForm parentTaskId={t.id} projectId={id} />
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section>
          <h2 className={`${display.className} mb-3 text-xl font-extrabold tracking-tight`}>Invoices</h2>
          {invoices.length === 0 ? (
            <div className={`${card} p-6 text-sm text-[#0E2F27]/65`}>No invoices for this project yet.</div>
          ) : (
            <div className={`${card} divide-y divide-[#0E2F27]/10`}>
              {invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}`}
                  className={`flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#F4F8F5]/60 ${focus}`}
                >
                  <span className="font-semibold text-[#1F6B52]">{inv.number}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-[#0E2F27]/55">{formatDate(inv.issue_date)}</span>
                    <StatusBadge status={inv.status} />
                    <span className="tabular-nums text-sm">{peso(inv.total)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className={`${display.className} mb-3 text-xl font-extrabold tracking-tight`}>Recent time</h2>
        {entries.length === 0 ? (
          <div className={`${card} p-6 text-sm text-[#0E2F27]/65`}>No time tracked for this project yet.</div>
        ) : (
          <div className={`${card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Task</th>
                    <th className={th}>Duration</th>
                    <th className={th}>Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E2F27]/10">
                  {entries.slice(0, 12).map((e) => (
                    <tr key={e.id} className={rowHover}>
                      <td className="px-5 py-3 text-[#0E2F27]/65">{formatDate(e.start_time)}</td>
                      <td className="px-5 py-3">{taskTitle.get(e.task_id) ?? '—'}</td>
                      <td className="px-5 py-3 tabular-nums">
                        {e.end_time ? (
                          hoursFromMinutes(e.duration_minutes)
                        ) : e.paused_at ? (
                          <span className="text-[#8a6412]">Paused</span>
                        ) : (
                          <span className="text-[#1F6B52]">Running…</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-[#0E2F27]/65">
                        {e.invoice_id ? (
                          <span className="text-[#1F6B52]">Invoiced</span>
                        ) : e.billable ? (
                          'Unbilled'
                        ) : (
                          'Not billable'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className={`${card} mt-8 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <h2 className="text-sm font-semibold text-[#0E2F27]/70">Danger zone</h2>
          <p className="mt-1 text-sm text-[#0E2F27]/65">Deleting a project removes its tasks and tracked time.</p>
        </div>
        <ConfirmAction
          action={deleteProject}
          id={id}
          message="Delete this project along with its tasks and tracked time?"
          className={btnDanger}
        >
          Delete project
        </ConfirmAction>
      </section>
    </>
  )
}
