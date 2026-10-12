import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ActionButton } from '@/components/ui/action-button'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { PrintButton } from '@/components/ui/print-button'
import { InvoiceDocument } from '@/components/invoice-document'
import { AttachmentSection } from '@/components/attachments/attachment-section'
import { PaymentForm } from './payment-form'
import { formatDate, formatDateTime, peso } from '@/lib/format'
import { fetchInvoiceSnapshot } from '@/lib/invoice'
import type { Attachment } from '@/lib/attachments'
import { btnPrimary, btnSecondary, btnDanger, card, focus } from '@/lib/ui'
import { deleteInvoice, deletePayment, markInvoiceSent, sendInvoice, voidInvoice } from '../actions'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Invoice · WorkSprout',
}

type PaymentRow = { id: string; amount: number | string; paid_at: string; method: string | null; note: string | null }

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const invoice = await fetchInvoiceSnapshot(supabase, id, userId)
  if (!invoice) notFound()

  const { data: paymentsData } = await supabase
    .from('payments')
    .select('id, amount, paid_at, method, note')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })
  const payments = (paymentsData ?? []) as PaymentRow[]

  const { data: attachmentsData } = await supabase
    .from('attachments')
    .select('id, name, path, mime_type, size_bytes, created_at')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false })
  const attachments = (attachmentsData ?? []) as Attachment[]

  const canVoid = invoice.baseStatus !== 'void' && invoice.status !== 'paid'
  const hasEmail = Boolean(invoice.client?.email)

  return (
    <>
      <PageHeader title={invoice.number} description={invoice.client?.name ?? undefined}>
        <Link href="/invoices" className={`${btnSecondary} ${focus} print:hidden`}>
          All invoices
        </Link>
        <PrintButton />
        {invoice.status !== 'void' && hasEmail ? (
          <ActionButton
            action={sendInvoice}
            id={id}
            className={`${btnPrimary} print:hidden`}
            pendingText="Sending…"
            okClassName="text-xs font-medium text-[#1F6B52]"
          >
            Send invoice
          </ActionButton>
        ) : (
          invoice.baseStatus === 'draft' && (
            <ActionButton action={markInvoiceSent} id={id} className={`${btnPrimary} print:hidden`} pendingText="Saving…">
              Mark as sent
            </ActionButton>
          )
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <InvoiceDocument invoice={invoice} />

        <aside className="space-y-6 print:hidden">
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-[#0E2F27]/60">Summary</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[#0E2F27]/65">Total</dt>
                <dd className="tabular-nums">{peso(invoice.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#0E2F27]/65">Paid</dt>
                <dd className="tabular-nums text-[#1F6B52]">{peso(invoice.amountPaid)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#0E2F27]/10 pt-2 font-bold">
                <dt>Balance</dt>
                <dd className={`${display.className} tabular-nums`}>{peso(invoice.balance)}</dd>
              </div>
            </dl>
            {invoice.sentAt && (
              <p className="mt-3 border-t border-[#0E2F27]/10 pt-3 text-xs text-[#0E2F27]/55">
                Last sent {formatDateTime(invoice.sentAt)}
              </p>
            )}
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-[#0E2F27]/60">Payments</h2>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-[#0E2F27]/65">No payments recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[#0E2F27]/10">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="text-sm">
                      <p className="font-semibold tabular-nums">{peso(p.amount)}</p>
                      <p className="text-xs text-[#0E2F27]/55">
                        {formatDate(p.paid_at)}
                        {p.method ? ` · ${p.method}` : ''}
                      </p>
                      {p.note && <p className="text-xs text-[#0E2F27]/55">{p.note}</p>}
                    </div>
                    <ConfirmAction
                      action={deletePayment}
                      id={p.id}
                      extra={{ invoice_id: id }}
                      message="Remove this payment?"
                      className={`${btnDanger} !px-2.5 !py-1.5 text-xs`}
                    >
                      Remove
                    </ConfirmAction>
                  </li>
                ))}
              </ul>
            )}

            {invoice.status !== 'void' && (
              <div className="mt-4 border-t border-[#0E2F27]/10 pt-4">
                <PaymentForm invoiceId={id} balance={invoice.balance} />
              </div>
            )}
          </section>

          <AttachmentSection
            title="Receipts & files"
            description="Attach expense receipts or supporting documents to this invoice."
            parentType="invoice"
            parentId={id}
            attachments={attachments}
            emptyText="No receipts attached yet."
          />

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-[#0E2F27]/60">Actions</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canVoid && (
                <ConfirmAction
                  action={voidInvoice}
                  id={id}
                  message="Void this invoice? Its tracked time becomes billable again."
                  className={btnDanger}
                >
                  Void invoice
                </ConfirmAction>
              )}
              {invoice.baseStatus === 'draft' && (
                <ConfirmAction
                  action={deleteInvoice}
                  id={id}
                  message="Delete this draft invoice?"
                  className={btnDanger}
                >
                  Delete draft
                </ConfirmAction>
              )}
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
