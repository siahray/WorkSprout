import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ActionButton } from '@/components/ui/action-button'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { PrintButton } from './print-button'
import { PaymentForm } from './payment-form'
import { formatDate, formatPercent, peso } from '@/lib/format'
import { btnPrimary, btnSecondary, btnDanger, card, focus } from '@/lib/ui'
import { deleteInvoice, deletePayment, markInvoiceSent, voidInvoice } from '../actions'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Invoice · WorkSprout',
}

type InvoiceView = {
  id: string
  number: string
  status: string
  base_status: string
  client_id: string
  project_name: string | null
  issue_date: string
  due_date: string | null
  tax_rate: number | string
  tax_label: string
  subtotal: number | string
  tax_amount: number | string
  total: number | string
  amount_paid: number | string
  balance: number | string
  notes: string | null
  client_name: string | null
}

type ItemRow = { id: string; description: string; quantity: number | string; unit_rate: number | string; amount: number | string }
type PaymentRow = { id: string; amount: number | string; paid_at: string; method: string | null; note: string | null }

function qty(value: number | string): string {
  return Number(value).toLocaleString('en-PH', { maximumFractionDigits: 2 })
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) redirect('/login')

  const { data: raw } = await supabase.from('invoice_balances').select('*').eq('id', id).maybeSingle()
  const invoice = raw as unknown as InvoiceView | null
  if (!invoice) notFound()

  const [itemsRes, paymentsRes, clientRes, profileRes] = await Promise.all([
    supabase.from('invoice_items').select('id, description, quantity, unit_rate, amount').eq('invoice_id', id).order('created_at', { ascending: true }),
    supabase.from('payments').select('id, amount, paid_at, method, note').eq('invoice_id', id).order('paid_at', { ascending: false }),
    supabase.from('clients').select('name, company, email, address, tax_id').eq('id', invoice.client_id).maybeSingle(),
    supabase.from('profiles').select('business_name, full_name, business_address, business_phone, email').eq('id', userId).maybeSingle(),
  ])

  const items = (itemsRes.data ?? []) as ItemRow[]
  const payments = (paymentsRes.data ?? []) as PaymentRow[]
  const client = clientRes.data
  const profile = profileRes.data

  const businessName = profile?.business_name || profile?.full_name || 'Your business'
  const canVoid = invoice.base_status !== 'void' && invoice.status !== 'paid'

  return (
    <>
      <PageHeader title={invoice.number} description={invoice.client_name ?? undefined}>
        <Link href="/invoices" className={`${btnSecondary} ${focus} print:hidden`}>
          All invoices
        </Link>
        <PrintButton />
        {invoice.base_status === 'draft' && (
          <ActionButton action={markInvoiceSent} id={id} className={`${btnPrimary} print:hidden`} pendingText="Saving…">
            Mark as sent
          </ActionButton>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className={`${card} p-8`}>
          <header className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className={`${display.className} text-xl font-extrabold tracking-tight`}>{businessName}</p>
              <div className="mt-1 space-y-0.5 text-sm text-[#0E2F27]/65">
                {profile?.business_address && <p className="whitespace-pre-line">{profile.business_address}</p>}
                {profile?.business_phone && <p>{profile.business_phone}</p>}
                {profile?.email && <p>{profile.email}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className={`${display.className} text-2xl font-extrabold tracking-tight`}>INVOICE</p>
              <p className="mt-1 text-sm font-semibold">{invoice.number}</p>
              <div className="mt-2 flex justify-end">
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </header>

          <div className="mt-8 flex flex-wrap justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#0E2F27]/50">Bill to</p>
              <div className="mt-1 space-y-0.5 text-sm">
                <p className="font-semibold">{client?.name}</p>
                {client?.company && <p>{client.company}</p>}
                {client?.address && <p className="whitespace-pre-line text-[#0E2F27]/65">{client.address}</p>}
                {client?.email && <p className="text-[#0E2F27]/65">{client.email}</p>}
                {client?.tax_id && <p className="text-[#0E2F27]/65">TIN: {client.tax_id}</p>}
              </div>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-8">
                <dt className="text-[#0E2F27]/60">Issued</dt>
                <dd className="font-medium">{formatDate(invoice.issue_date)}</dd>
              </div>
              <div className="flex justify-between gap-8">
                <dt className="text-[#0E2F27]/60">Due</dt>
                <dd className="font-medium">{invoice.due_date ? formatDate(invoice.due_date) : '—'}</dd>
              </div>
              {invoice.project_name && (
                <div className="flex justify-between gap-8">
                  <dt className="text-[#0E2F27]/60">Project</dt>
                  <dd className="font-medium">{invoice.project_name}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#0E2F27]/15 text-left text-[#0E2F27]/55">
                <tr>
                  <th className="py-2 font-medium">Description</th>
                  <th className="py-2 text-right font-medium">Qty</th>
                  <th className="py-2 text-right font-medium">Rate</th>
                  <th className="py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E2F27]/8">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">{item.description}</td>
                    <td className="py-3 text-right tabular-nums">{qty(item.quantity)}</td>
                    <td className="py-3 text-right tabular-nums">{peso(item.unit_rate)}</td>
                    <td className="py-3 text-right tabular-nums">{peso(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#0E2F27]/65">Subtotal</span>
              <span className="tabular-nums">{peso(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#0E2F27]/65">
                {invoice.tax_label} ({formatPercent(invoice.tax_rate)})
              </span>
              <span className="tabular-nums">{peso(invoice.tax_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-[#0E2F27]/10 pt-2 font-bold">
              <span>Total</span>
              <span className={`${display.className} tabular-nums`}>{peso(invoice.total)}</span>
            </div>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-[#1F6B52]">
                  <span>Amount paid</span>
                  <span className="tabular-nums">−{peso(invoice.amount_paid)}</span>
                </div>
                <div className="flex justify-between border-t border-[#0E2F27]/10 pt-2 text-base font-bold">
                  <span>Balance due</span>
                  <span className={`${display.className} tabular-nums`}>{peso(invoice.balance)}</span>
                </div>
              </>
            )}
          </div>

          {invoice.notes && (
            <div className="mt-8 border-t border-[#0E2F27]/10 pt-4 text-sm text-[#0E2F27]/70">
              <p className="font-semibold text-[#0E2F27]/60">Notes</p>
              <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </article>

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
                <dd className="tabular-nums text-[#1F6B52]">{peso(invoice.amount_paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#0E2F27]/10 pt-2 font-bold">
                <dt>Balance</dt>
                <dd className={`${display.className} tabular-nums`}>{peso(invoice.balance)}</dd>
              </div>
            </dl>
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
                <PaymentForm invoiceId={id} balance={Number(invoice.balance)} />
              </div>
            )}
          </section>

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
              {invoice.base_status === 'draft' && (
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
