// Calendar-day arithmetic for reporting ranges.
//
// Everything here operates on plain `YYYY-MM-DD` strings, treated as dates on
// a calendar (not instants), which is how the app already handles `date`
// columns like `spent_on` and `issue_date`. Day stepping goes through UTC so
// the host's timezone and DST can never shift a day boundary; timestamps
// coming back from PostgREST are bucketed to the Manila day, matching
// `formatDate`. All functions are pure — today is passed in — so the edge
// cases are pinned by tests rather than by staring at a calendar.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** True for a syntactically valid calendar day (`2026-02-30` is invalid). */
export function isIsoDay(value: string | undefined | null): value is string {
  if (!value || !ISO_DAY.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  )
}

function toUtc(isoDay: string): Date {
  return new Date(`${isoDay}T00:00:00Z`)
}

/** `2026-10-19` → `2026-10-19` shifted by whole days (may leave the month). */
export function addDays(isoDay: string, days: number): string {
  const date = toUtc(isoDay)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Monday of the week containing `isoDay` (ISO weeks start Monday). */
export function weekStart(isoDay: string): string {
  const date = toUtc(isoDay)
  const sinceMonday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - sinceMonday)
  return date.toISOString().slice(0, 10)
}

/** First day of `isoDay`'s month: `2026-10-19` → `2026-10-01`. */
export function monthStart(isoDay: string): string {
  return `${isoDay.slice(0, 7)}-01`
}

/** Last day of `isoDay`'s month (inclusive end of a month range). */
export function monthEnd(isoDay: string): string {
  const [y, m] = isoDay.split('-').map(Number)
  // Day 0 of the *next* month is the last day of this one.
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

/** Move a month-anchored day by whole months, clamping to month length. */
export function addMonths(isoDay: string, months: number): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const target = new Date(Date.UTC(y, m - 1 + months, 1))
  // Day 0 of the month after the target is the target's last day.
  const last = Number(
    new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0))
      .toISOString()
      .slice(8, 10),
  )
  target.setUTCDate(Math.min(d, last))
  return target.toISOString().slice(0, 10)
}

/** Days in [from, to], inclusive — empty when `to` precedes `from`. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day)
  return days
}

/** `YYYY-MM` key of a day, for month bucketing. */
export function monthKey(isoDay: string): string {
  return isoDay.slice(0, 7)
}

/** `2026-10` → "October 2026", from local parts so no timezone can shift it. */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

/** The Manila calendar day a PostgREST timestamp belongs to. */
export function manilaDayOf(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

/** Start-of-day instant for an ISO day in Manila (fixed UTC+8, no DST). */
export function manilaDayStart(timestamp: string): string {
  return `${timestamp}T00:00:00+08:00`
}

export type DateRange = { from: string; to: string }

export type PeriodKind = 'week' | 'month'

/**
 * Resolve the Time page's `?view=timesheet&period=&start=` into a day range.
 * A missing, malformed, or future `start` collapses to the period containing
 * today — you can browse back through past timesheets, never into next week.
 */
export function resolvePeriodRange(
  period: PeriodKind,
  rawStart: string | undefined,
  today: string,
): DateRange {
  const currentFrom = period === 'week' ? weekStart(today) : monthStart(today)
  const anchor = isIsoDay(rawStart) ? rawStart : today
  const requested = period === 'week' ? weekStart(anchor) : monthStart(anchor)
  const from = requested > currentFrom ? currentFrom : requested
  const to = period === 'week' ? addDays(from, 6) : monthEnd(from)
  return { from, to }
}

/**
 * Turn untrusted ?from=/?to= into a sane range: valid days, ordered, and
 * capped at 24 month buckets so cash-flow stays bounded (24 months back from
 * the end month, inclusive). Falls back to the month to date when either end
 * is unusable.
 */
export function resolveRange(
  rawFrom: string | undefined,
  rawTo: string | undefined,
  today: string,
): DateRange {
  const fallback = { from: monthStart(today), to: today }
  if (!isIsoDay(rawFrom) || !isIsoDay(rawTo) || rawFrom > rawTo) return fallback
  const earliest = addMonths(monthStart(rawTo), -23)
  if (rawFrom < earliest) return { from: earliest, to: rawTo }
  return { from: rawFrom, to: rawTo }
}
