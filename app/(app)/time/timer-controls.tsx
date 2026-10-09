'use client'

import { useEffect, useState, useTransition } from 'react'
import { pauseTimer, resumeTimer, startTimer, stopTimer } from './actions'
import { alertError, btnAccent, btnSecondary, card, focus, input } from '@/lib/ui'
import { display } from '@/lib/fonts'
import { formatElapsed, timerElapsedSeconds, type RunningTimer } from '@/lib/timer'

export type ProjectOption = {
  id: string
  name: string
  clientName: string | null
  tasks: { id: string; title: string }[]
}

export type ActiveTimer = RunningTimer

export function StartTimer({
  projects,
  initialProjectId,
  hasRunning,
  emptyMessage,
  bare = false,
}: {
  projects: ProjectOption[]
  initialProjectId?: string
  hasRunning: boolean
  emptyMessage?: string
  bare?: boolean
}) {
  const withTasks = projects.filter((p) => p.tasks.length > 0)
  const first = withTasks.find((p) => p.id === initialProjectId) ?? withTasks[0]

  const [projectId, setProjectId] = useState(first?.id ?? '')
  const [taskId, setTaskId] = useState(first?.tasks[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const tasks = projects.find((p) => p.id === projectId)?.tasks ?? []

  if (withTasks.length === 0) {
    return (
      <div
        className={
          bare
            ? 'rounded-xl bg-[#F4F8F5] p-5 text-sm text-[#0E2F27]/65'
            : `${card} p-6 text-sm text-[#0E2F27]/65`
        }
      >
        {emptyMessage ?? 'Add a project and at least one task, then you can start tracking time here.'}
      </div>
    )
  }

  function changeProject(id: string) {
    setProjectId(id)
    setTaskId(projects.find((p) => p.id === id)?.tasks[0]?.id ?? '')
    setError(null)
  }

  function submit() {
    if (!taskId) {
      setError('Choose a task first.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await startTimer(taskId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[#0E2F27]/60">Project</span>
          <select
            value={projectId}
            onChange={(event) => changeProject(event.target.value)}
            className={input}
          >
            {withTasks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.clientName ? `${p.clientName} · ` : ''}
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-[#0E2F27]/60">Task</span>
          <select
            value={taskId}
            onChange={(event) => setTaskId(event.target.value)}
            disabled={tasks.length === 0}
            className={input}
          >
            {tasks.length === 0 ? (
              <option value="">No tasks in this project</option>
            ) : (
              tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {error && <p role="alert" className={alertError}>{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending || !taskId} className={`${btnAccent} ${focus}`}>
          {pending ? 'Starting…' : 'Start timer'}
        </button>
        {hasRunning && <span className="text-xs text-[#0E2F27]/55">Starting a new timer stops the current one.</span>}
      </div>
    </form>
  )
}

export function RunningTimerCard({ active }: { active: ActiveTimer }) {
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const paused = active.pausedAt != null
  const elapsed = formatElapsed(timerElapsedSeconds(active, now))

  function run(action: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      await action()
    })
  }

  return (
    <div
      className={`${card} relative overflow-hidden p-6 ${
        paused ? 'border-[#F4B63F]/50' : 'border-[#2E9E6B]/40'
      }`}
    >
      <span
        className={`absolute inset-x-0 top-0 h-1 ${paused ? 'bg-[#F4B63F]' : 'bg-[#2E9E6B]'}`}
        aria-hidden="true"
      />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${
              paused ? 'text-[#8a6412]' : 'text-[#1F6B52]'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {!paused && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2E9E6B] opacity-60" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${paused ? 'bg-[#F4B63F]' : 'bg-[#2E9E6B]'}`}
              />
            </span>
            {paused ? 'Paused' : 'Running now'}
          </span>
          <p className="mt-2 truncate font-semibold text-[#0E2F27]">{active.label}</p>
          <p
            suppressHydrationWarning
            className={`${display.className} mt-3 text-4xl font-extrabold leading-none tabular-nums sm:text-5xl ${
              paused ? 'text-[#8a6412]' : 'text-[#1F6B52]'
            }`}
          >
            {elapsed}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => (paused ? resumeTimer(active.id) : pauseTimer(active.id)))}
            className={`${btnSecondary} ${focus}`}
          >
            {pending ? 'Working…' : paused ? 'Resume' : 'Pause'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => stopTimer(active.id))}
            className={`${btnAccent} bg-[#0E2F27] hover:bg-[#1F6B52] ${focus}`}
          >
            {pending ? 'Stopping…' : 'Stop & save'}
          </button>
        </div>
      </div>
    </div>
  )
}
