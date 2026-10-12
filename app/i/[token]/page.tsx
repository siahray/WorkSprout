import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoiceDocument } from '@/components/invoice-document'
import { PrintButton } from '@/components/ui/print-button'
import { snapshotFromPublic } from '@/lib/invoice'
import { isUuid } from '@/lib/validation'
import { btnPrimary, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Invoice · WorkSprout',
  robots: { index: false, follow: false },
}

// Read-only invoice, reachable by anyone holding the (unguessable) share token.
export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!isUuid(token)) notFound()

  const supabase = await createClient()
  const { data } = await supabase.rpc('invoice_public', { p_token: token })
  const invoice = snapshotFromPublic(data)
  if (!invoice) notFound()

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2E9E6B]" aria-hidden="true" />
          <span className={`${display.className} text-sm font-extrabold tracking-tight text-[#0E2F27]`}>WorkSprout</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <a href={`/i/${token}/pdf`} className={`${btnPrimary} ${focus}`}>
            Download PDF
          </a>
          <PrintButton label="Print" />
        </div>
      </header>

      <InvoiceDocument invoice={invoice} />

      <p className="mt-6 text-center text-xs text-[#0E2F27]/45">
        This invoice was shared by {invoice.business.name}. Powered by WorkSprout.
      </p>
    </main>
  )
}
