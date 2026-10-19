import { test, expect } from 'bun:test'
import { formatLogRecord } from '../lib/log'

// Logs end up in Vercel's log explorer; a record has to be parseable JSON and
// strictly single-line or one error with a stack trace swallows its neighbours.
test('formatLogRecord emits valid single-line JSON with level and event', () => {
  const line = formatLogRecord('error', 'create client failed')
  expect(JSON.parse(line)).toEqual({ level: 'error', event: 'create client failed' })
  expect(line).not.toContain('\n')
})

test('formatLogRecord keeps primitive context fields', () => {
  const parsed = JSON.parse(
    formatLogRecord('error', 'resend send failed', { status: 422, detail: 'ok' })
  )
  expect(parsed).toEqual({ status: 422, detail: 'ok', level: 'error', event: 'resend send failed' })
})

test('formatLogRecord normalizes Errors to message, name and stack', () => {
  const line = formatLogRecord('error', 'boom', { error: new Error('db down') })
  const parsed = JSON.parse(line)
  expect(parsed.error.message).toBe('db down')
  expect(parsed.error.name).toBe('Error')
  expect(typeof parsed.error.stack).toBe('string')
  // Stacks contain real newlines; JSON escaping keeps the record one line.
  expect(line).not.toContain('\n')
})

test('formatLogRecord round-trips Supabase errors including code and details', () => {
  const pgError = {
    message: 'duplicate key value violates unique constraint',
    code: '23505',
    details: 'Key (id)=(1) already exists.',
    hint: '',
  }
  const parsed = JSON.parse(formatLogRecord('error', 'insert failed', { error: pgError }))
  expect(parsed.error).toEqual(pgError)
})

test('formatLogRecord drops null and undefined fields', () => {
  const parsed = JSON.parse(formatLogRecord('error', 'x', { a: undefined, b: null, c: 1 }))
  expect(parsed).toEqual({ c: 1, level: 'error', event: 'x' })
})

test('formatLogRecord does not let context override level or event', () => {
  const parsed = JSON.parse(formatLogRecord('error', 'x', { level: 'info', event: 'spoof' }))
  expect(parsed.level).toBe('error')
  expect(parsed.event).toBe('x')
})

test('formatLogRecord falls back to a string for circular values', () => {
  const circular: Record<string, unknown> = {}
  circular.self = circular
  const parsed = JSON.parse(formatLogRecord('error', 'x', { error: circular }))
  expect(typeof parsed.error).toBe('string')
})
