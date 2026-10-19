import { test, expect } from 'bun:test'
import { sanitizeSearch } from '../lib/search'

// A raw comma inside .or() fails PostgREST's filter parsing (PGRST100) and
// turns the whole list page into a 400 — verified against the live API. The
// comma becomes LIKE's single-character wildcard instead, which still matches
// the comma it replaced, so "Smith, John" keeps finding "Smith, John".
test('sanitizeSearch neutralises the characters that break .or() filters', () => {
  expect(sanitizeSearch('Smith, John')).toBe('Smith_ John')
  expect(sanitizeSearch('draft) or (1=1')).toBe('draft_ or _1=1')
  expect(sanitizeSearch('back\\slash')).toBe('back_slash')
  // Pasted line breaks become wildcards too, so a multi-line note still matches.
  expect(sanitizeSearch('netflix\n\tand  chill')).toBe('netflix__and chill')
})

test('sanitizeSearch leaves real search text alone', () => {
  expect(sanitizeSearch('INV-0042')).toBe('INV-0042')
  // Dots, spaces, and hyphens all parse fine in .or() (also verified live),
  // and invoice numbers, dates, and versions are full of them.
  expect(sanitizeSearch('2026.10.15')).toBe('2026.10.15')
  expect(sanitizeSearch('Acme Corp')).toBe('Acme Corp')
  expect(sanitizeSearch('café — ñand')).toBe('café — ñand')
})

test('sanitizeSearch trims, collapses whitespace, and caps length', () => {
  expect(sanitizeSearch(undefined)).toBe('')
  expect(sanitizeSearch('')).toBe('')
  expect(sanitizeSearch('   ')).toBe('')
  expect(sanitizeSearch('  netflix   extra  ')).toBe('netflix extra')
  expect(sanitizeSearch('x'.repeat(200))).toHaveLength(100)
  // The cap can strand a trailing space after slicing a long query down.
  expect(sanitizeSearch(`${'x'.repeat(99)} y`)).toBe(`${'x'.repeat(99)}`)
})
