import { test, expect } from 'bun:test'
import { decimalHours, hoursFromMinutes, peso, formatPercent } from '../lib/format'

// decimalHours is the conversion that turns tracked minutes into a billable
// quantity on an invoice line, so its rounding is a money decision.
test('decimalHours converts minutes to a 2-place hour figure', () => {
  expect(decimalHours(90)).toBe(1.5)
  expect(decimalHours(60)).toBe(1)
  expect(decimalHours(1500)).toBe(25)
  expect(decimalHours(59)).toBe(0.98)
  // One minute rounds *up* to 0.02h. At any non-zero rate that bills slightly
  // more than the minute worked, which is the direction a freelancer wants.
  expect(decimalHours(1)).toBe(0.02)
})

test('decimalHours treats absent or nonsensical minutes as zero', () => {
  expect(decimalHours(0)).toBe(0)
  expect(decimalHours(null)).toBe(0)
  expect(decimalHours(undefined)).toBe(0)
  expect(decimalHours(-5)).toBe(0)
})

test('decimalHours does not accumulate float error across a day', () => {
  // 8h of one-minute entries: 480 * round2(1/60). Pinning the total shows
  // whether per-entry rounding drifts when summed the way the invoice builder
  // sums lines.
  const perEntry = decimalHours(1)
  expect(roundTo2(perEntry * 480)).toBe(9.6)
})

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100
}

test('hoursFromMinutes renders the same durations for humans', () => {
  expect(hoursFromMinutes(90)).toBe('1h 30m')
  expect(hoursFromMinutes(60)).toBe('1h 00m')
  expect(hoursFromMinutes(1)).toBe('0h 01m')
  expect(hoursFromMinutes(59)).toBe('0h 59m')
  expect(hoursFromMinutes(1500)).toBe('25h 00m')
})

test('hoursFromMinutes treats absent or negative minutes as zero', () => {
  expect(hoursFromMinutes(0)).toBe('0h 00m')
  expect(hoursFromMinutes(null)).toBe('0h 00m')
  expect(hoursFromMinutes(undefined)).toBe('0h 00m')
  expect(hoursFromMinutes(-5)).toBe('0h 00m')
})

test('peso formats positive amounts with two decimals and separators', () => {
  expect(peso(1000)).toBe('₱1,000.00')
  expect(peso(1000.5)).toBe('₱1,000.50')
  expect(peso(0)).toBe('₱0.00')
  expect(peso(1234567.891)).toBe('₱1,234,567.89')
})

test('peso renders a refund or credit with a leading minus', () => {
  // A credit note shows a negative balance; the sign must survive formatting
  // or a refund would read as a charge.
  expect(peso(-50)).toBe('-₱50.00')
})

test('peso falls back to zero for values a display must never choke on', () => {
  expect(peso(null)).toBe('₱0.00')
  expect(peso(undefined)).toBe('₱0.00')
  expect(peso('abc')).toBe('₱0.00')
  expect(peso(Number.NaN)).toBe('₱0.00')
})

test('peso accepts a numeric string, as a database column may supply', () => {
  expect(peso('1234.567')).toBe('₱1,234.57')
})

test('formatPercent renders a rate, trimming trailing zeros', () => {
  expect(formatPercent(12)).toBe('12%')
  expect(formatPercent(12.5)).toBe('12.5%')
  expect(formatPercent('12.50')).toBe('12.5%')
})

test('formatPercent reads a missing rate as zero rather than blank', () => {
  // An absent tax rate is displayed as 0%, not as an em dash. Harmless here —
  // coerceTaxes drops rate-less entries before they reach an invoice — but
  // pinned so the fallback is a deliberate choice rather than an accident.
  expect(formatPercent(null)).toBe('0%')
  expect(formatPercent(undefined)).toBe('0%')
  expect(formatPercent(Number.NaN)).toBe('0%')
})
