import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logError } from '@/lib/log'

// Unauthenticated liveness probe for uptime monitors (UptimeRobot, Better
// Stack, …). It reports whether the database is still reachable and never
// exposes configuration values, only that they are present. Route handlers
// are rendered per-request by default in this Next version, so the response
// is never stale from cache.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const headers = { 'Cache-Control': 'no-store' }
  const time = new Date().toISOString()

  if (!url || !key) {
    return NextResponse.json(
      { status: 'unavailable', database: 'unconfigured', time },
      { status: 503, headers }
    )
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  // A head count runs `select count(*)` server-side. RLS hides every row from
  // the anon key, but the query still executes — proving PostgREST and the
  // database are reachable, which is all a liveness probe should ask.
  const { error } = await supabase.from('profiles').select('id', { count: 'exact', head: true })
  if (error) {
    logError('health database probe failed', { error })
    return NextResponse.json(
      { status: 'unavailable', database: 'down', time },
      { status: 503, headers }
    )
  }

  return NextResponse.json({ status: 'ok', database: 'up', time }, { headers })
}
