'use client'

import { useEffect, useState, useTransition } from 'react'
import { pauseTimer, resumeTimer, stopTimer } from '@/app/(app)/time/actions'
import { focus } from '@/lib/ui'
import { formatElapsed, timerElapsedSeconds, type RunningTimer } from '@/lib/timer'

export type ActiveTimerInfo = RunningTimer

export function ActiveTimer({ active }: { active: ActiveTimerInfo | null }) {
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])

  if (!active) return null

  const paused = active.pausedAt != null
  const display = formatElapsed(timerElapsedSeconds(active, now))

  function run(action: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      await action()
    })
  }

  return (
    <div
      className={`animate-rise-in flex items-center gap-2 rounded-control border py-1 pl-3 pr-1 ${
        paused ? 'border-mango/40 bg-mango-wash' : 'border-sprout/30 bg-sprout-wash'
      }`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {!paused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sprout opacity-70" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${paused ? 'bg-mango' : 'bg-sprout'}`}
        />
      </span>
      <span
        className={`hidden max-w-[13rem] truncate text-small font-medium sm:inline ${
          paused ? 'text-mango-deep' : 'text-sprout-deep'
        }`}
      >
        {active.label}
      </span>
      <span
        className={`tabular-nums text-small font-semibold ${paused ? 'text-mango-deep' : 'text-sprout-deep'}`}
      >
        {display}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => (paused ? resumeTimer(active.id) : pauseTimer(active.id)))}
        className={`rounded-control bg-panel px-3 py-1 text-meta font-semibold text-ink ring-1 ring-line-strong transition-colors hover:bg-canvas disabled:opacity-55 ${focus}`}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => stopTimer(active.id))}
        className={`rounded-control bg-ink px-3 py-1 text-meta font-semibold text-white transition-colors hover:bg-ink-deep disabled:opacity-55 ${focus}`}
      >
        {pending ? 'Stopping…' : 'Stop'}
      </button>
    </div>
  )
}
