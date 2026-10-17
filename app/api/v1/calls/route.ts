import type { NextRequest } from 'next/server'
import { authFailure, authenticate } from '@/lib/api-auth'
import { readJsonBody, withIdempotency } from '@/lib/api-idempotency'
import { scheduleCall } from '@/lib/api-mutations'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeError } from '@/lib/api-errors'

// Books an appointment. Send `Idempotency-Key` so a retry cannot book it twice.

export async function POST(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return authFailure(auth)

  const parsed = await readJsonBody(request)
  if (!parsed.ok) return parsed.response

  return withIdempotency(request, auth.userId, parsed.raw, async () => {
    const result = await scheduleCall(
      createAdminClient(),
      auth.userId,
      (parsed.body ?? {}) as Record<string, unknown>,
    )
    if (!result.ok) return writeError(result.status, result.error)
    return { status: 201, body: { id: result.value.id } }
  })
}
