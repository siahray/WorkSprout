import { test, expect } from 'bun:test'
import {
  addDays,
  addMonths,
  eachDay,
  isIsoDay,
  manilaDayOf,
  manilaDayStart,
  monthEnd,
  monthKey,
  monthLabel,
  monthStart,
  resolvePeriodRange,
  resolveRange,
  weekStart,
} from '../lib/period'

test('isIsoDay accepts real calendar days and rejects everything else', () => {
  expect(isIsoDay('2026-10-19')).toBe(true)
  expect(isIsoDay('2024-02-29')).toBe(true) // leap day
  expect(isIsoDay('2026-02-30')).toBe(false)
  expect(isIsoDay('2026-02-29')).toBe(false)
  expect(isIsoDay('2026-13-01')).toBe(false)
  expect(isIsoDay('19-10-2026')).toBe(false)
  expect(isIsoDay('2026-10-19T00:00:00Z')).toBe(false)
  expect(isIsoDay('')).toBe(false)
  expect(isIsoDay(undefined)).toBe(false)
  expect(isIsoDay(null)).toBe(false)
})

test('addDays steps across month and year boundaries', () => {
  expect(addDays('2026-10-19', 1)).toBe('2026-10-20')
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  expect(addDays('2026-10-19', 6)).toBe('2026-10-25')
})

test('weekStart lands on the Monday of the week containing the day', () => {
  expect(weekStart('2026-10-19')).toBe('2026-10-19') // already a Monday
  expect(weekStart('2026-10-25')).toBe('2026-10-19') // the Sunday after
  expect(weekStart('2026-10-21')).toBe('2026-10-19') // midweek
  expect(weekStart('2026-10-18')).toBe('2026-10-12') // the Sunday before
  expect(weekStart('2026-01-01')).toBe('2025-12-29') // year boundary
})

test('monthStart and monthEnd bracket the month', () => {
  expect(monthStart('2026-10-19')).toBe('2026-10-01')
  expect(monthEnd('2026-10-19')).toBe('2026-10-31')
  expect(monthEnd('2026-02-10')).toBe('2026-02-28')
  expect(monthEnd('2024-02-10')).toBe('2024-02-29')
  expect(monthEnd('2025-12-05')).toBe('2025-12-31')
})

test('addMonths clamps to the target month length', () => {
  expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
  expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  expect(addMonths('2026-12-01', 1)).toBe('2027-01-01')
  expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  expect(addMonths('2026-10-01', -23)).toBe('2024-11-01')
})

test('eachDay lists the range inclusive and never loops backwards', () => {
  expect(eachDay('2026-10-19', '2026-10-21')).toEqual([
    '2026-10-19',
    '2026-10-20',
    '2026-10-21',
  ])
  expect(eachDay('2026-10-19', '2026-10-19')).toEqual(['2026-10-19'])
  expect(eachDay('2026-10-21', '2026-10-19')).toEqual([])
})

test('monthKey and monthLabel name the month', () => {
  expect(monthKey('2026-10-19')).toBe('2026-10')
  expect(monthLabel('2026-10')).toBe('October 2026')
  expect(monthLabel('2027-01')).toBe('January 2027')
})

test('manilaDayOf buckets timestamps to the Manila calendar day', () => {
  expect(manilaDayOf('2026-10-19T00:30:00Z')).toBe('2026-10-19') // 08:30 Manila
  expect(manilaDayOf('2026-10-18T16:00:00Z')).toBe('2026-10-19') // exactly midnight
  expect(manilaDayOf('2026-10-18T15:59:00Z')).toBe('2026-10-18') // a minute before
  expect(manilaDayOf('2026-10-19T15:59:00Z')).toBe('2026-10-19') // 23:59 Manila
})

test('manilaDayStart is the fixed UTC+8 start of the day', () => {
  expect(manilaDayStart('2026-10-19')).toBe('2026-10-19T00:00:00+08:00')
})

test('resolveRange falls back to the month to date on unusable input', () => {
  expect(resolveRange(undefined, undefined, '2026-10-19')).toEqual({
    from: '2026-10-01',
    to: '2026-10-19',
  })
  expect(resolveRange('garbage', '2026-10-19', '2026-10-19')).toEqual({
    from: '2026-10-01',
    to: '2026-10-19',
  })
  // from after to is not a range.
  expect(resolveRange('2026-11-01', '2026-10-01', '2026-10-19')).toEqual({
    from: '2026-10-01',
    to: '2026-10-19',
  })
})

test('resolveRange passes sane ranges and caps the span at 24 months', () => {
  expect(resolveRange('2026-07-01', '2026-10-19', '2026-10-19')).toEqual({
    from: '2026-07-01',
    to: '2026-10-19',
  })
  // Exactly 23 months back from the end month = 24 buckets: allowed.
  expect(resolveRange('2024-11-01', '2026-10-19', '2026-10-19')).toEqual({
    from: '2024-11-01',
    to: '2026-10-19',
  })
  // One day older gets pulled back to that boundary.
  expect(resolveRange('2024-10-31', '2026-10-19', '2026-10-19')).toEqual({
    from: '2024-11-01',
    to: '2026-10-19',
  })
})

test('resolvePeriodRange defaults to the period containing today', () => {
  // 2026-10-19 is a Monday, so "this week" starts today.
  expect(resolvePeriodRange('week', undefined, '2026-10-19')).toEqual({
    from: '2026-10-19',
    to: '2026-10-25',
  })
  expect(resolvePeriodRange('month', undefined, '2026-10-19')).toEqual({
    from: '2026-10-01',
    to: '2026-10-31',
  })
  // A malformed start collapses to the current period rather than erroring.
  expect(resolvePeriodRange('week', 'soon', '2026-10-19')).toEqual({
    from: '2026-10-19',
    to: '2026-10-25',
  })
})

test('resolvePeriodRange walks back through past periods but never forward', () => {
  expect(resolvePeriodRange('week', '2026-10-05', '2026-10-19')).toEqual({
    from: '2026-10-05',
    to: '2026-10-11',
  })
  expect(resolvePeriodRange('month', '2026-08-14', '2026-10-19')).toEqual({
    from: '2026-08-01',
    to: '2026-08-31',
  })
  // A start inside a future week snaps back to the current one.
  expect(resolvePeriodRange('week', '2026-11-02', '2026-10-19')).toEqual({
    from: '2026-10-19',
    to: '2026-10-25',
  })
  // Midweek future anchor: next Monday would be 2026-10-26 > current start.
  expect(resolvePeriodRange('week', '2026-10-24', '2026-10-19')).toEqual({
    from: '2026-10-19',
    to: '2026-10-25',
  })
  expect(resolvePeriodRange('month', '2026-12-05', '2026-10-19')).toEqual({
    from: '2026-10-01',
    to: '2026-10-31',
  })
})
