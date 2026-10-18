import { test, expect } from 'bun:test'
import { money, quantity } from '../lib/validation'

// Builds a FormData the way a submitted form would, so these exercise the real
// parser rather than a stand-in.
function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

// `money` is the payment entry point: it turns what a person typed into the
// number that gets stored and later summed into an invoice's paid total.
test('money parses a plain amount', () => {
  expect(money(form({ amount: '1500' }), 'amount')).toBe(1500)
  expect(money(form({ amount: '1500.50' }), 'amount')).toBe(1500.5)
})

test('money tolerates the separators a person pastes in', () => {
  expect(money(form({ amount: '₱1,500.00' }), 'amount')).toBe(1500)
  expect(money(form({ amount: '1,500' }), 'amount')).toBe(1500)
  expect(money(form({ amount: ' 1500 ' }), 'amount')).toBe(1500)
  expect(money(form({ amount: 'P1500' }), 'amount')).toBe(1500)
  expect(money(form({ amount: 'p1500' }), 'amount')).toBe(1500)
})

test('money rounds to two decimal places', () => {
  expect(money(form({ amount: '1500.567' }), 'amount')).toBe(1500.57)
  expect(money(form({ amount: '1500.564' }), 'amount')).toBe(1500.56)
})

test('money rejects values that are not a positive amount', () => {
  expect(money(form({ amount: '' }), 'amount')).toBeNull()
  expect(money(form({ amount: '₱,' }), 'amount')).toBeNull() // only separators
  expect(money(form({ amount: 'abc' }), 'amount')).toBeNull()
  expect(money(form({ amount: '-50' }), 'amount')).toBeNull()
  expect(money(form({ amount: 'Infinity' }), 'amount')).toBeNull()
  expect(money(form({ amount: 'NaN' }), 'amount')).toBeNull()
})

test('money reads a missing field as null rather than throwing', () => {
  expect(money(form({}), 'amount')).toBeNull()
})

test('quantity parses hours and units the same way', () => {
  expect(quantity(form({ qty: '2.5' }), 'qty')).toBe(2.5)
  expect(quantity(form({ qty: '1,000' }), 'qty')).toBe(1000)
  expect(quantity(form({ qty: '12.345' }), 'qty')).toBe(12.35)
  expect(quantity(form({ qty: '-1' }), 'qty')).toBeNull()
  expect(quantity(form({ qty: 'abc' }), 'qty')).toBeNull()
  expect(quantity(form({}), 'qty')).toBeNull()
})

// quantity strips commas but, unlike money, has no currency symbol to strip —
// a stray ₱ must therefore *not* be silently accepted here.
test('quantity does not strip a currency symbol', () => {
  expect(quantity(form({ qty: '₱5' }), 'qty')).toBeNull()
})
