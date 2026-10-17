import type { NextRequest } from 'next/server'
import { authFailure, authenticate } from '@/lib/api-auth'
import { readJsonBody, withIdempotency } from '@/lib/api-idempotency'
import { createClientRecord } from '@/lib/api-mutations'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeError } from '@/lib/api-errors'

// Creates a client. Send `Idempotency-Key` so a retry cannot create a duplicate.

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return authFailure(auth)

  const parsed = await readJsonBody(request)
  if (!parsed.ok) return parsed.response

  return withIdempotency(request, auth.userId, parsed.raw, async () => {
    const result = await createClientRecord(
      createAdminClient(),
      auth.userId,
      (parsed.body ?? {}) as Record<string, unknown>,
    )
    if (!result.ok) return writeError(result.status, result.error)
    return { status: 201, body: { id: result.value.id } }
  })
}
