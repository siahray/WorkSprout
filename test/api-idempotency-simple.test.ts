import { test, expect } from 'bun:test'
import { readJsonBody, withIdempotency, type IdempotencyRequest } from '../lib/api-idempotency'
import { createFakeSupabase } from './fake-supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

function makeRequest(text: string, key?: string) {
  return {
    method: 'POST',
    nextUrl: { pathname: '/api/v1/clients' },
    headers: { get: (k: string) => (k.toLowerCase() === 'idempotency-key' ? key ?? null : null) },
    text: async () => text,
  }
}

test('readJsonBody', async () => {
  let r = await readJsonBody(makeRequest(''))
  expect(r.ok).toBe(true)
  r = await readJsonBody(makeRequest('{"x":1}'))
  expect(r.ok).toBe(true)
  r = await readJsonBody(makeRequest('{bad}'))
  expect(r.ok).toBe(false)
})

test('withIdempotency runs without key', async () => {
  const { supabase } = createFakeSupabase()
  let ran = 0
  const res = await withIdempotency(
    makeRequest('{}') as IdempotencyRequest,
    supabase as SupabaseClient,
    'u1',
    '{}',
    async () => {
      ran++
      return { status: 201, body: { id: 'c1' } }
    },
  )
  expect(ran).toBe(1)
  expect(res.status).toBe(201)
})
