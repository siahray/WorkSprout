import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

export type IdempotentResult = { status: number; body: unknown }

const MAX_KEY_LENGTH = 200

function errorResponse(status: number, error: string, message: string): Response {
  return Response.json({ error, message }, { status })
}

export type JsonBodyRequest = {
  text(): Promise<string>
}

/**
 * Reads and parses a JSON body once, so the same text can be hashed and handed to
 * the handler. An empty body is treated as `{}` rather than an error.
 */
export async function readJsonBody(
  request: JsonBodyRequest,
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

export type IdempotencyRequest = {
  method: string
  nextUrl: { pathname: string }
  headers: { get(name: string): string | null }
}

/**
 * Runs `run` at most once per (user, Idempotency-Key).
 *
 * Without the header the handler simply runs: the key is optional.
 */
export async function withIdempotency(
  request: IdempotencyRequest,
  supabase: SupabaseClient,
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

  const path = request.nextUrl.pathname
  const requestHash = hashRequest(request.method, path, rawBody)

  const { error: reserveError } = await supabase
    .from('idempotency_keys')
    .insert({ user_id: userId, key, method: request.method, path, request_hash: requestHash })

  if (reserveError) {
    if (reserveError.code !== '23505') {
      console.error('idempotency reserve failed:', reserveError.message)
      return errorResponse(503, 'idempotency_failed', 'Could not record the request — try again.')
    }
    return replayOrRefuse(supabase, userId, key, requestHash)
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
    console.error('idempotency save failed:', saveError.message)
  }

  return Response.json(result.body, { status: result.status })
}

async function replayOrRefuse(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  requestHash: string,
): Promise<Response> {
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

  return Response.json(data.response_body ?? {}, { status: (data.response_status as number) ?? 200 })
}
