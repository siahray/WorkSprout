import { test, expect } from 'bun:test'
import { createClientRecord } from '../lib/api-mutations'
import type { SupabaseClient } from '@supabase/supabase-js'

test('createClientRecord rejects missing name', async () => {
  const supabase = {
    from: () => ({
      insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
    }),
  } as unknown as SupabaseClient
  const res = await createClientRecord(supabase, 'u1', {})
  expect(res.ok).toBe(false)
})
