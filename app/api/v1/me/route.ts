import type { NextRequest } from 'next/server'
import { authFailure, authenticate } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

// Connection test for the integration API: a 200 here means the key is valid
// and unrevoked. Automation tools call this when a user wires the connection up.

export async function GET(request: NextRequest) {
  const auth = await authenticate(request)
  if (!auth.ok) return authFailure(auth)

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', auth.userId)
    .maybeSingle()

  return Response.json({
    user_id: auth.userId,
    email: (profile?.email as string | null) ?? null,
    key: { name: auth.keyName, prefix: auth.prefix },
  })
}
