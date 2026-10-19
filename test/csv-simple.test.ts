import { test, expect } from 'bun:test'
import { csvCell, toCsv, csvResponse } from '../lib/csv'

test('csvCell leaves ordinary values alone', () => {
  expect(csvCell('Growth retainer')).toBe('Growth retainer')
  expect(csvCell(1234.56)).toBe('1234.56')
  expect(csvCell('2026-10-19')).toBe('2026-10-19')
  expect(csvCell('₱1,000')).toBe('"₱1,000"')
})

test('csvCell quotes only what would break a spreadsheet import', () => {
  expect(csvCell('Smith, John')).toBe('"Smith, John"')
  expect(csvCell('say "hi"')).toBe('"say ""hi"""')
  expect(csvCell('line one\nline two')).toBe('"line one\nline two"')
  expect(csvCell(null)).toBe('')
  expect(csvCell(undefined)).toBe('')
})

test('toCsv writes the header once, then one line per row', () => {
  const csv = toCsv(['date', 'description'], [
    ['2026-10-01', 'Coffee, beans'],
    ['2026-10-02', 'Says "no"'],
  ])
  expect(csv).toBe(
    'date,description\n2026-10-01,"Coffee, beans"\n2026-10-02,"Says ""no"""',
  )
})

test('toCsv keeps a header-only file valid on empty data', () => {
  expect(toCsv(['a', 'b'], [])).toBe('a,b')
})

test('csvResponse ships a dated attachment with the right content type', () => {
  const res = csvResponse('a,b', 'worksprout-expenses')
  expect(res.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
  const disposition = res.headers.get('Content-Disposition') ?? ''
  expect(disposition).toMatch(/^attachment; filename="worksprout-expenses-\d{4}-\d{2}-\d{2}\.csv"$/)
})
