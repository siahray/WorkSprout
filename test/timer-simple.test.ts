import { test, expect } from 'bun:test'
import { formatElapsed, timerElapsedSeconds, type RunningTimer } from '../lib/timer'

const START = Date.parse('2026-01-01T10:00:00Z')
const iso = (ms: number) => new Date(ms).toISOString()

function timer(overrides: Partial<RunningTimer> = {}): RunningTimer {
  return {
    id: 't1',
    label: 'Design review',
    startTime: iso(START),
    pausedSeconds: 0,
    pausedAt: null,
    ...overrides,
  }
}

test('elapsed is wall-clock time since start', () => {
  expect(timerElapsedSeconds(timer(), START + 90_000)).toBe(90)
  expect(timerElapsedSeconds(timer(), START + 3_600_000)).toBe(3600)
})

test('elapsed excludes completed pauses', () => {
  // An hour of wall clock, of which ten minutes was already paused and closed
  // out: fifty minutes should count.
  expect(timerElapsedSeconds(timer({ pausedSeconds: 600 }), START + 3_600_000)).toBe(3000)
})

test('elapsed excludes a pause still running', () => {
  // Paused at +30min, observed at +60min: the open pause has eaten 30 minutes,
  // so only 30 minutes of work remain.
  const t = timer({ pausedAt: iso(START + 1_800_000) })
  expect(timerElapsedSeconds(t, START + 3_600_000)).toBe(1800)
})

test('elapsed subtracts both the closed and the open pause together', () => {
  // Closed pauses (pausedSeconds) plus the open one (pausedAt) both come off.
  const t = timer({ pausedSeconds: 600, pausedAt: iso(START + 1_800_000) })
  expect(timerElapsedSeconds(t, START + 3_600_000)).toBe(1200)
})

test('a pause that has not started yet does not add time back', () => {
  // pausedAt in the future would make `now - pausedAt` negative and *increase*
  // elapsed if it were not clamped. max(0, ...) keeps a corrupt clock from
  // inflating billable time.
  const t = timer({ pausedAt: iso(START + 999_000_000) })
  expect(timerElapsedSeconds(t, START + 3_600_000)).toBe(3600)
})

test('a clock ahead of the start time yields zero, never a negative', () => {
  expect(timerElapsedSeconds(timer(), START - 5_000)).toBe(0)
})

test('elapsed floors partial seconds rather than rounding up', () => {
  // 1.9s in should bill 1s, not 2s — rounding up would accrue time the user
  // has not actually worked.
  expect(timerElapsedSeconds(timer(), START + 1_900)).toBe(1)
  expect(timerElapsedSeconds(timer(), START + 999)).toBe(0)
})

test('a zero-length timer reads as zero', () => {
  expect(timerElapsedSeconds(timer(), START)).toBe(0)
})

test('formatElapsed renders hours, minutes and seconds', () => {
  expect(formatElapsed(0)).toBe('0:00:00')
  expect(formatElapsed(59)).toBe('0:00:59')
  expect(formatElapsed(60)).toBe('0:01:00')
  expect(formatElapsed(3661)).toBe('1:01:01')
})

test('formatElapsed pads so the pill does not shift width', () => {
  // Minutes and seconds always take two digits, so the header pill does not
  // resize every second. The hours field is *not* padded, so a timer past 100
  // hours grows by a character.
  expect(formatElapsed(359_999)).toBe('99:59:59')
  expect(formatElapsed(360_000)).toBe('100:00:00')
  expect(formatElapsed(3_600_000)).toBe('1000:00:00')
})
