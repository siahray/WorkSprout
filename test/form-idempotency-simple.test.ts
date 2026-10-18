import { test, expect } from 'bun:test'
import { claimFormSubmission, releaseFormClaim, storeFormResponse } from '../lib/form-idempotency'
import { createFakeSupabase } from './fake-supabase'

// Derived from the helper's own signature rather than importing SupabaseClient:
// the fake only implements the handful of query shapes the helper actually
// calls, so asking it to satisfy the full client type would be a lie.
type Client = Parameters<typeof claimFormSubmission>[0]

test('a new key is claimed so the mutation runs', async () => {
  const { supabase } = createFakeSupabase()
  const claim = await claimFormSubmission(supabase as Client, 'u1', 'k1')
  expect(claim.kind).toBe('claimed')
})

test('an empty key is treated as no key, so the mutation still runs', async () => {
  const { supabase, log } = createFakeSupabase()
  const claim = await claimFormSubmission(supabase as Client, 'u1', '   ')
  expect(claim.kind).toBe('claimed')
  // Nothing was written — a form predating this mechanism keeps working.
  expect(log.filter((l) => l === 'form.insert')).toHaveLength(0)
})

test('an oversized key is treated as no key rather than erroring', async () => {
  const { supabase } = createFakeSupabase()
  const claim = await claimFormSubmission(supabase as Client, 'u1', 'x'.repeat(201))
  expect(claim.kind).toBe('claimed')
})

test('replaying a completed key returns the stored response', async () => {
  const { supabase } = createFakeSupabase()
  const key = 'k-replay'

  const first = await claimFormSubmission(supabase as Client, 'u1', key)
  expect(first.kind).toBe('claimed')

  const response = { ok: 'Payment recorded.' }
  await storeFormResponse(supabase as Client, 'u1', key, response)

  const second = await claimFormSubmission(supabase as Client, 'u1', key)
  expect(second.kind).toBe('replay')
  if (second.kind === 'replay') expect(second.response).toEqual(response)
})

test('a key still in flight reports in_progress, not success', async () => {
  const { supabase } = createFakeSupabase()
  const key = 'k-flight'

  // Claimed, but storeFormResponse never ran: the first attempt is still going
  // (or died). We must not invent a success we cannot vouch for.
  await claimFormSubmission(supabase as Client, 'u1', key)
  const second = await claimFormSubmission(supabase as Client, 'u1', key)
  expect(second.kind).toBe('in_progress')
})

test('keys are scoped per user, so two accounts do not collide', async () => {
  const { supabase } = createFakeSupabase()

  const a = await claimFormSubmission(supabase as Client, 'user-a', 'shared')
  expect(a.kind).toBe('claimed')

  // Same key, different user: must be a fresh claim, not a replay.
  const b = await claimFormSubmission(supabase as Client, 'user-b', 'shared')
  expect(b.kind).toBe('claimed')
})

test('releasing a claim lets the same form be resubmitted', async () => {
  const { supabase } = createFakeSupabase()
  const key = 'k-retry'

  await claimFormSubmission(supabase as Client, 'u1', key)

  // A failed attempt hands the key back...
  await releaseFormClaim(supabase as Client, 'u1', key)

  // ...so a corrected resubmit is treated as new rather than as a replay.
  const retry = await claimFormSubmission(supabase as Client, 'u1', key)
  expect(retry.kind).toBe('claimed')
})

test('an unreachable table falls through to claimed, so nothing is dropped', async () => {
  const { supabase } = createFakeSupabase({
    formSubmissions: { insertError: { code: 'XX000', message: 'connection refused' } },
  })

  // We could not record the claim, so we cannot promise a single write — but
  // silently swallowing the user's payment would be worse than risking a
  // duplicate. Let the mutation run.
  const claim = await claimFormSubmission(supabase as Client, 'u1', 'k1')
  expect(claim.kind).toBe('claimed')
})

test('a row pruned between conflict and read is treated as new', async () => {
  const { supabase } = createFakeSupabase({
    formSubmissions: { insertError: { code: '23505', message: 'duplicate key value' } },
  })

  // Conflict said the key exists, but the follow-up read finds nothing.
  const claim = await claimFormSubmission(supabase as Client, 'u1', 'k1')
  expect(claim.kind).toBe('claimed')
})

test('a failed store still leaves the key claimable for a replay', async () => {
  const { supabase } = createFakeSupabase({
    formSubmissions: { updateError: { code: 'XX000', message: 'connection refused' } },
  })

  const claim = await claimFormSubmission(supabase as Client, 'u1', 'k1')
  expect(claim.kind).toBe('claimed')

  // The write happened but the response could not be saved. That only weakens
  // replay; it must not throw and turn a successful payment into an error.
  await expect(storeFormResponse(supabase as Client, 'u1', 'k1', { ok: 'x' })).resolves.toBeUndefined()
})
