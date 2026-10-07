// Shared shape + math for the running timer, used by the header pill and the
// timer cards. Paused time is excluded from the elapsed count.
export type RunningTimer = {
  id: string
  label: string
  startTime: string
  pausedAt: string | null
  pausedSeconds: number
}

export function timerElapsedSeconds(timer: RunningTimer, now: number): number {
  const pausedMs =
    timer.pausedSeconds * 1000 +
    (timer.pausedAt ? Math.max(0, now - new Date(timer.pausedAt).getTime()) : 0)
  return Math.max(0, Math.floor((now - new Date(timer.startTime).getTime() - pausedMs) / 1000))
}

export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
