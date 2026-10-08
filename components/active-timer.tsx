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
      className={`flex items-center gap-2 rounded-full border py-1 pl-3 pr-1 ${
        paused ? 'border-[#F4B63F]/40 bg-[#F4B63F]/15' : 'border-[#2E9E6B]/30 bg-[#2E9E6B]/10'
      }`}
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {!paused && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2E9E6B] opacity-70" />
        )}
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${paused ? 'bg-[#F4B63F]' : 'bg-[#2E9E6B]'}`}
        />
      </span>
      <span
        className={`hidden max-w-[13rem] truncate text-sm font-medium sm:inline ${
          paused ? 'text-[#8a6412]' : 'text-[#1F6B52]'
        }`}
      >
        {active.label}
      </span>
      <span
        className={`tabular-nums text-sm font-semibold ${paused ? 'text-[#8a6412]' : 'text-[#1F6B52]'}`}
      >
        {display}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => (paused ? resumeTimer(active.id) : pauseTimer(active.id)))}
        className={`rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#0E2F27] ring-1 ring-[#0E2F27]/15 transition-colors hover:bg-[#F4F8F5] disabled:opacity-60 ${focus}`}
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => stopTimer(active.id))}
        className={`rounded-full bg-[#0E2F27] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#1F6B52] disabled:opacity-60 ${focus}`}
      >
        {pending ? 'Stopping…' : 'Stop'}
      </button>
    </div>
  )
}
