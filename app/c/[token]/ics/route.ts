import { createClient } from '@/lib/supabase/server'
import { callIcs, snapshotFromPublicCall } from '@/lib/call'
import { siteUrl } from '@/lib/site'
import { isUuid } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isUuid(token)) return new Response('Not found', { status: 404 })

  const supabase = await createClient()
  const { data } = await supabase.rpc('call_public', { p_token: token })
  const call = snapshotFromPublicCall(data)
  if (!call) return new Response('Not found', { status: 404 })

  call.publicToken = token
  const base = await siteUrl()
  const link = base ? `${base}/c/${token}` : null
  const ics = await callIcs(call, link)

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="call.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
