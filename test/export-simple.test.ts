import { test, expect } from 'bun:test'
import { fetchAll } from '../lib/export'

type Row = { id: number }

function pages(rows: Row[]) {
  const calls: [number, number][] = []
  const fetchRange = (from: number, to: number) => {
    calls.push([from, to])
    return Promise.resolve({ data: rows.slice(from, to + 1), error: null })
  }
  return { calls, fetchRange }
}

test('fetchAll walks pages until a short page ends the data', async () => {
  const rows = Array.from({ length: 1249 }, (_, id) => ({ id }))
  const { calls, fetchRange } = pages(rows)
  const all = await fetchAll<Row>(fetchRange)
  expect(all).not.toBeNull()
  expect(all!.length).toBe(1249)
  expect(all![0].id).toBe(0)
  expect(all![1248].id).toBe(1248)
  expect(calls).toEqual([
    [0, 999],
    [1000, 1999],
  ])
})

test('fetchAll makes one extra round trip at exact page boundaries', async () => {
  const rows = Array.from({ length: 2000 }, (_, id) => ({ id }))
  const { calls, fetchRange } = pages(rows)
  const all = await fetchAll<Row>(fetchRange)
  expect(all!.length).toBe(2000)
  // The empty third page is what proves the data has run out.
  expect(calls.length).toBe(3)
})

test('fetchAll returns null on a query error instead of a partial file', async () => {
  let calls = 0
  const fetchRange = () => {
    calls += 1
    // The first page is full, so the fetcher keeps walking — and the error
    // on page two must void the whole export, not ship a half file.
    return calls === 1
      ? Promise.resolve({ data: Array.from({ length: 1000 }, (_, id) => ({ id })), error: null })
      : Promise.resolve({ data: null, error: { message: 'boom' } })
  }
  expect(await fetchAll(fetchRange)).toBeNull()
  expect(calls).toBe(2)
})

test('fetchAll refuses to loop forever on a fetcher that never runs dry', async () => {
  let calls = 0
  const fetchRange = () => {
    calls += 1
    return Promise.resolve({
      data: Array.from({ length: 1000 }, (_, id) => ({ id })),
      error: null,
    })
  }
  expect(await fetchAll(fetchRange)).toBeNull()
  expect(calls).toBe(50)
})
