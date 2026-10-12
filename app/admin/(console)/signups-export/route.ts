import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HEADER = ['email', 'full_name', 'profession', 'source', 'signed_up_at', 'invited_at']

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims?.app_metadata?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  const needle = (request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase()
  const status = request.nextUrl.searchParams.get('status') ?? 'all'

  const { data: rows, error } = await supabase
    .from('beta_signups')
    .select('email, full_name, profession, source, created_at, invited_at')
    .order('created_at', { ascending: false })

  if (error) return new Response('Failed to load signups', { status: 500 })

  const filtered = (rows ?? []).filter((signup) => {
    if (status === 'invited' && !signup.invited_at) return false
    if (status === 'pending' && signup.invited_at) return false
    if (!needle) return true
    return [signup.email, signup.full_name, signup.profession].some((value) =>
      (value ?? '').toLowerCase().includes(needle)
    )
  })

  const lines = [HEADER.join(',')]
  for (const signup of filtered) {
    const record = signup as Record<string, unknown>
    lines.push(HEADER.map((key) => csvCell(record[key])).join(','))
  }

  const date = new Date().toISOString().slice(0, 10)
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="worksprout-signups-${date}.csv"`,
    },
  })
}
