import { test, expect } from 'bun:test'
import { coerceTaxes, round2, taxLines, taxTotal, type Tax } from '../lib/tax'

// round2 is the primitive every invoice total is built from, so its behaviour
// under floating point is load-bearing. These pin what it *actually* does, not
// what a reader might assume.
test('round2 survives the float artifacts money math hits', () => {
  expect(round2(0.1 + 0.2)).toBe(0.3) // 0.30000000000000004
  expect(round2(4.35 * 100)).toBe(435) // 434.99999999999994
  expect(round2(1.001 * 1000)).toBe(1001) // 1000.9999999999999
})

// Documented quirks, asserted so a future reader is not surprised. A decimal
// that looks like an exact half rarely is once stored in binary, so the
// direction of rounding is decided by the representation, not by the digits
// you see.
test('round2 rounds half-cases according to binary representation', () => {
  expect(round2(1.005)).toBe(1) // 1.005 * 100 is 100.49999999999999, rounds down
  expect(round2(2.675)).toBe(2.68) // 267.50000000000006, rounds up
  expect(round2(0.065)).toBe(0.07) // exactly 6.5, rounds up
  expect(round2(0.145)).toBe(0.14) // 14.499999999999998, rounds down
})

test('taxTotal equals the sum of the rounded lines it displays', () => {
  // The invariant the comment in tax.ts promises: amounts are rounded per tax
  // *so that* the invoice total matches the sum of the displayed lines. For
  // subtotal 1.01 with two 33.33% taxes the two approaches genuinely diverge —
  // per-line rounding gives 0.68, rounding the raw sum gives 0.67. An invoice
  // whose printed lines did not add up to its printed total would be a real
  // credibility problem, so this is pinned.
  const taxes: Tax[] = [
    { label: 'VAT', rate: 33.33 },
    { label: 'Withholding', rate: 33.33 },
  ]
  const lines = taxLines(1.01, taxes)
  expect(lines.map((l) => l.amount)).toEqual([0.34, 0.34])
  expect(taxTotal(1.01, taxes)).toBe(0.68)
  expect(taxTotal(1.01, taxes)).toBe(lines.reduce((sum, l) => sum + l.amount, 0))
})

// Each tax is applied to the subtotal independently — taxes do not compound.
test('taxTotal applies every rate to the same base', () => {
  const taxes: Tax[] = [
    { label: 'VAT', rate: 12 },
    { label: 'Service fee', rate: 5 },
  ]
  expect(taxLines(1000, taxes)).toEqual([
    { label: 'VAT', rate: 12, amount: 120 },
    { label: 'Service fee', rate: 5, amount: 50 },
  ])
  expect(taxTotal(1000, taxes)).toBe(170)
})

test('taxTotal with no taxes is zero', () => {
  expect(taxTotal(1000, [])).toBe(0)
  expect(taxLines(1000, [])).toEqual([])
})

// coerceTaxes is the trust boundary for a jsonb value the user can edit. A
// malformed rate must never reach an invoice.
test('coerceTaxes drops entries that would corrupt an invoice', () => {
  expect(coerceTaxes(null)).toEqual([])
  expect(coerceTaxes('not an array')).toEqual([])
  expect(coerceTaxes([null, 'string', 42])).toEqual([])
  expect(
    coerceTaxes([
      { label: 'VAT', rate: 'twelve' }, // non-numeric rate
      { label: 'VAT', rate: Number.NaN },
      { label: 'VAT', rate: 0 }, // zero is not a tax
      { label: 'VAT', rate: -5 }, // negative
      { label: 'VAT', rate: 101 }, // above 100
      { label: '   ', rate: 12 }, // blank label
      { label: '', rate: 12 }, // empty label
    ]),
  )
})

test('coerceTaxes keeps valid entries, trimming labels and rounding rates', () => {
  expect(coerceTaxes([{ label: '  VAT  ', rate: 12.004 }])).toEqual([{ label: 'VAT', rate: 12 }])
  expect(coerceTaxes([{ label: 'VAT', rate: '12.5' }])).toEqual([{ label: 'VAT', rate: 12.5 }])
  expect(coerceTaxes([{ label: 'VAT', rate: 100 }])).toEqual([{ label: 'VAT', rate: 100 }])
})

test('coerceTaxes caps a label at 60 characters and the list at 12 entries', () => {
  const longLabel = 'x'.repeat(100)
  const [first] = coerceTaxes([{ label: longLabel, rate: 12 }])
  expect(first.label).toHaveLength(60)

  const many = Array.from({ length: 20 }, (_, i) => ({ label: `T${i}`, rate: 1 }))
  expect(coerceTaxes(many)).toHaveLength(12)
})

test('coerceTaxes tolerates a partially valid array', () => {
  // One bad entry must not discard the good ones beside it.
  expect(
    coerceTaxes([
      { label: 'VAT', rate: 12 },
      { label: 'Broken', rate: -1 },
      { label: 'Fee', rate: 5 },
    ]),
  ).toEqual([
    { label: 'VAT', rate: 12 },
    { label: 'Fee', rate: 5 },
  ])
})
