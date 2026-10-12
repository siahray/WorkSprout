import { createClient } from '@/lib/supabase/server'
import { snapshotFromPublic } from '@/lib/invoice'
import { buildInvoicePdf } from '@/lib/invoice-pdf'
import { isUuid } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isUuid(token)) return new Response('Not found', { status: 404 })

  const supabase = await createClient()
  const { data } = await supabase.rpc('invoice_public', { p_token: token })
  const invoice = snapshotFromPublic(data)
  if (!invoice) return new Response('Not found', { status: 404 })

  const pdf = await buildInvoicePdf(invoice)

  return new Response(Buffer.from(pdf) as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}
