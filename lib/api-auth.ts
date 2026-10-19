// Bearer API-key authentication for /api/v1 routes.
//
// Keys are looked up by hash and the owning user is returned; every handler
// then scopes its queries to that user explicitly, because the admin client
// used here bypasses RLS.

import { logError } from '@/lib/log'
import type { NextRequest } from 'next/server'
import { createAdminClient, adminClientConfigured } from '@/lib/supabase/admin'
import { hashApiKey, looksLikeApiKey } from '@/lib/api-keys'

export type ApiAuth =
  | { ok: true; userId: string; keyId: string; keyName: string; prefix: string }
  | { ok: false; status: number; error: string; message: string }

function jsonError(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status })
}

/** Turns a failed authentication into its response, preserving the status. */
export function authFailure(failure: Extract<ApiAuth, { ok: false }>): Response {
  return jsonError(failure.status, failure.error, failure.message)
}

export function badRequest(error: string, message: string): Response {
  return jsonError(400, error, message)
}

/** Reads the bearer token from the Authorization header. */
export function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1].trim() : null
}

export async function authenticate(request: NextRequest): Promise<ApiAuth> {
  const token = bearerToken(request)
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'missing_key',
      message: 'Provide an API key as `Authorization Bearer <key>`.',
    }
  }
  if (!looksLikeApiKey(token)) {
    return { ok: false, status: 401, error: 'invalid_key', message: 'That API key is not valid.' }
  }

  // Checked after the token, so an obviously bad request is rejected on its own
  // merits rather than reporting a server misconfiguration.
  if (!adminClientConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'not_configured',
      message: 'The integration API is not set up: add SUPABASE_SERVICE_ROLE_KEY to the environment.',
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, prefix, revoked_at')
    .eq('key_hash', hashApiKey(token))
    .maybeSingle()

  if (error) {
    logError('api key lookup failed', { error })
    return {
      ok: false,
      status: 503,
      error: 'lookup_failed',
      message: 'Could not verify the API key right now — try again.',
    }
  }
  if (!data) {
    return { ok: false, status: 401, error: 'invalid_key', message: 'That API key is not valid.' }
  }
  if (data.revoked_at) {
    return { ok: false, status: 401, error: 'revoked_key', message: 'That API key has been revoked.' }
  }

  // Best-effort: a failure to record usage must not fail the request.
  const { error: touchError } = await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
  if (touchError) logError('api key touch failed', { error: touchError })

  return {
    ok: true,
    userId: data.user_id as string,
    keyId: data.id as string,
    keyName: data.name as string,
    prefix: data.prefix as string,
  }
}
