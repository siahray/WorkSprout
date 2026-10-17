// Idempotency and body parsing for the integration API's write endpoints.
//
// A retrying caller is the normal case, not the exception: a tool that times out
// will try the same request again. `Idempotency-Key` makes that safe — the first
// request runs the handler and records its response, and a replay of the same
// key returns that response instead of acting twice.

import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type IdempotentResult = { status: number; body: unknown }

const MAX_KEY_LENGTH = 200

function errorResponse(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status })
}

/**
 * Reads and parses a JSON body once, so the same text can be hashed and handed to
 * the handler. An empty body is treated as `{}` rather than an error.
 */
export async function readJsonBody(
  request: NextRequest,
): Promise<{ ok: true; raw: string; body: unknown } | { ok: false; response: Response }> {
  let raw: string
  try {
    raw = await request.text()
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'unreadable_body', 'Could not read the request body.'),
    }
  }

  if (!raw.trim()) return { ok: true, raw: '', body: {} }

  try {
    return { ok: true, raw, body: JSON.parse(raw) }
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'invalid_json', 'The request body must be valid JSON.'),
    }
  }
}

function hashRequest(method: string, path: string, rawBody: string): string {
  return createHash('sha256').update(`${method}\n${path}\n${rawBody}`).digest('hex')
}

/**
 * Runs `run` at most once per (user, Idempotency-Key).
 *
 * Without the header the handler simply runs: the key is optional, and omitting
 * it means the caller accepts that a retry could act twice.
 *
 * supabase-js has no transactions, so reserving the key and recording the result
 * are separate statements. The window between them is what the 'in_progress'
 * status covers: a concurrent retry with the same key is refused rather than
 * racing. A crash inside that window leaves the key stuck as 'in_progress', so
 * that one key can never be reused — the caller uses a new key, and the rows are
 * prunable (see the migration).
 */
export async function withIdempotency(
  request: NextRequest,
  userId: string,
  rawBody: string,
  run: () => Promise<IdempotentResult>,
): Promise<Response> {
  const key = request.headers.get('idempotency-key')?.trim()

  if (!key) {
    const result = await run()
    return Response.json(result.body, { status: result.status })
  }
  if (key.length > MAX_KEY_LENGTH) {
    return errorResponse(
      400,
      'invalid_idempotency_key',
      `An Idempotency-Key must be ${MAX_KEY_LENGTH} characters or fewer.`,
    )
  }

  const supabase = createAdminClient()
  const path = request.nextUrl.pathname
  const requestHash = hashRequest(request.method, path, rawBody)

  const { error: reserveError } = await supabase
    .from('idempotency_keys')
    .insert({ user_id: userId, key, method: request.method, path, request_hash: requestHash })

  if (reserveError) {
    // 23505 = unique_violation: this key has already been used.
    if (reserveError.code !== '23505') {
      console.error('idempotency reserve failed:', reserveError.message)
      return errorResponse(503, 'idempotency_failed', 'Could not record the request — try again.')
    }
    return replayOrRefuse(userId, key, requestHash)
  }

  const result = await run()

  const { error: saveError } = await supabase
    .from('idempotency_keys')
    .update({
      status: 'completed',
      response_status: result.status,
      response_body: result.body,
      completed_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('key', key)
  if (saveError) {
    // The work itself succeeded, so this is reported, not fatal: the caller gets
    // the real outcome and only loses replay protection for this key.
    console.error('idempotency save failed:', saveError.message)
  }

  return Response.json(result.body, { status: result.status })
}

async function replayOrRefuse(userId: string, key: string, requestHash: string): Promise<Response> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('idempotency_keys')
    .select('request_hash, status, response_status, response_body')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle()

  if (!data) {
    return errorResponse(503, 'idempotency_failed', 'Could not record the request — try again.')
  }
  if (data.request_hash !== requestHash) {
    return errorResponse(
      409,
      'idempotency_conflict',
      'This Idempotency-Key has already been used with a different request.',
    )
  }
  if (data.status !== 'completed') {
    return errorResponse(
      409,
      'request_in_progress',
      'A request with this Idempotency-Key is still in progress. Retry shortly, or use a new key.',
    )
  }

  // Replay the original response, so a retry sees exactly what the first call saw.
  return Response.json(data.response_body ?? {}, { status: (data.response_status as number) ?? 200 })
}
