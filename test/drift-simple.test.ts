import { test, expect } from 'bun:test'
import { summarizeDrift } from '../lib/drift'

// Shapes come from `supabase migration list --output-format json`: paired
// entries repeat the version on both sides; a missing side is an empty
// string (not null) in practice — both are tolerated here.
test('summarizeDrift counts identical pairs as synced', () => {
  const summary = summarizeDrift([
    { local: '20260101000000', remote: '20260101000000', time: '2026-01-01 00:00:00' },
    { local: '20261019100000', remote: '20261019100000', time: '2026-10-19 10:00:00' },
  ])
  expect(summary).toEqual({
    synced: 2,
    localOnly: [],
    remoteOnly: [],
    mismatched: [],
  })
})

test('summarizeDrift flags a local file that was never applied', () => {
  const summary = summarizeDrift([
    { local: '20990101000000', remote: '', time: '2099-01-01 00:00:00' },
    { local: '20260101000000', remote: '20260101000000' },
  ])
  expect(summary.localOnly).toEqual(['20990101000000'])
  expect(summary.synced).toBe(1)
})

test('summarizeDrift flags a remote migration with no local file', () => {
  const summary = summarizeDrift([
    { local: '', remote: '20261001120000' },
    { local: null, remote: '20261002120000' },
  ])
  expect(summary.remoteOnly).toEqual(['20261001120000', '20261002120000'])
})

test('summarizeDrift flags versions that differ between the two sides', () => {
  const summary = summarizeDrift([{ local: '20260101000000', remote: '20260102000000' }])
  expect(summary.mismatched).toEqual([{ local: '20260101000000', remote: '20260102000000' }])
  expect(summary.synced).toBe(0)
})

test('summarizeDrift handles empty input', () => {
  expect(summarizeDrift([])).toEqual({ synced: 0, localOnly: [], remoteOnly: [], mismatched: [] })
})
