import { logError } from '@/lib/log'
import type { NextRequest } from 'next/server'
import { authFailure, authenticate, badRequest } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// The pull feed described in openapi/work-sprout.v1.yaml.
//
// Event ids are a single monotonic sequence, so `after=<id>` is an exact cursor:
// re-running it returns the same events again rather than skipping them, which
// makes polling safe to retry and puts deduplication (on `id`) in the consumer.

const DEFAULT_LIMIT = 100
const MAX_LIMIT = 500

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return authFailure(auth)

  const params = request.nextUrl.searchParams

  const afterRaw = params.get('after')
  const after = afterRaw === null || afterRaw === '' ? 0 : Number(afterRaw)
  if (!Number.isInteger(after) || after < 0) {
    return badRequest('invalid_after', '`after` must be a non-negative integer.')
  }

  const limitRaw = params.get('limit')
  const limit = limitRaw === null || limitRaw === '' ? DEFAULT_LIMIT : Number(limitRaw)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return badRequest('invalid_limit', `\`limit\` must be an integer between 1 and ${MAX_LIMIT}.`)
  }

  const type = params.get('type')

  const supabase = createAdminClient()
  // The key's own user is the only scope this client may read.
  let query = supabase
    .from('events')
    .select('id, type, payload, created_at')
    .eq('user_id', auth.userId)
    .gt('id', after)
    .order('id', { ascending: true })
    // One extra row reveals whether more remain without a second count query.
    .limit(limit + 1)

  if (type) query = query.eq('type', type)

  const { data, error } = await query
  if (error) {
    logError('list events failed', { error })
    return Response.json(
      { error: 'lookup_failed', message: 'Could not read events right now — try again.' },
      { status: 503 },
    )
  }

  const rows = data ?? []
  const hasMore = rows.length > limit
  const events = hasMore ? rows.slice(0, limit) : rows
  const last = events.at(-1)

  return Response.json(
    {
      events: events.map((row) => ({
        id: row.id as number,
        type: row.type as string,
        created_at: row.created_at as string,
        payload: (row.payload ?? {}) as Record<string, unknown>,
      })),
      has_more: hasMore,
      next: last ? (last.id as number) : null,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
