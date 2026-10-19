import { test, expect } from 'bun:test'
import { clampedPage, listHref, pageCount, pageRange, parsePage, PAGE_SIZE } from '../lib/pagination'

// ?page= is untrusted text: whatever a person or a mangled link puts there,
// the list has to render somewhere sane (page 1) rather than throw.
test('parsePage reads a usable page number out of anything', () => {
  expect(parsePage(undefined)).toBe(1)
  expect(parsePage('')).toBe(1)
  expect(parsePage('abc')).toBe(1)
  expect(parsePage('0')).toBe(1)
  expect(parsePage('-4')).toBe(1)
  expect(parsePage('2')).toBe(2)
  expect(parsePage('12')).toBe(12)
  // Repeated params arrive as arrays; the first one wins.
  expect(parsePage(['3', '9'])).toBe(3)
})

test('pageRange matches PostgREST’s inclusive bounds', () => {
  // .range(from, to) includes both ends, so page 1 has to stop at size - 1
  // or every page would overlap the next one by a row.
  expect(pageRange(1, 50)).toEqual({ from: 0, to: 49 })
  expect(pageRange(2, 50)).toEqual({ from: 50, to: 99 })
  expect(pageRange(3, 20)).toEqual({ from: 40, to: 59 })
  expect(PAGE_SIZE).toBe(50)
})

test('pageCount rounds up but never reports zero pages', () => {
  expect(pageCount(0)).toBe(1)
  expect(pageCount(1)).toBe(1)
  expect(pageCount(50)).toBe(1)
  expect(pageCount(51)).toBe(2)
  expect(pageCount(100)).toBe(2)
  expect(pageCount(101)).toBe(3)
})

test('clampedPage pulls an out-of-range ?page= back to a real page', () => {
  // ?page=999 on a 3-page list redirects to page 3 instead of rendering an
  // empty table under a "Page 999 of 12" heading.
  expect(clampedPage(999, 3)).toBe(3)
  expect(clampedPage(4, 3)).toBe(3)
  expect(clampedPage(2, 3)).toBe(2)
  expect(clampedPage(0, 3)).toBe(1)
  expect(clampedPage(5, 0)).toBe(1)
})

test('listHref carries the filters along and drops the noise', () => {
  // Page 1 stays canonical: no ?page=1 hanging off the first page.
  expect(listHref('/invoices', { q: 'inv' }, 1)).toBe('/invoices?q=inv')
  expect(listHref('/invoices', { q: 'inv' }, 2)).toBe('/invoices?q=inv&page=2')
  expect(listHref('/time', { project: 'abc' }, 3)).toBe('/time?project=abc&page=3')
  expect(listHref('/time', {}, 3)).toBe('/time?page=3')
  expect(listHref('/invoices', {}, 1)).toBe('/invoices')
  // A cleared search must not come back as an empty ?q=.
  expect(listHref('/invoices', { q: '', project: undefined }, 1)).toBe('/invoices')
})
