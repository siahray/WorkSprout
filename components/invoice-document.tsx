// The rendered invoice body, shared by the owner's detail page and the public
// share page so both always look identical.

import { StatusBadge } from '@/components/ui/status-badge'
import type { InvoiceSnapshot } from '@/lib/invoice'
import { taxLines } from '@/lib/tax'
import { formatDate, formatPercent, peso } from '@/lib/format'
import { card } from '@/lib/ui'
import { display } from '@/lib/fonts'

function qty(value: number): string {
  return value.toLocaleString('en-PH', { maximumFractionDigits: 2 })
}

export function InvoiceDocument({ invoice, className = '' }: { invoice: InvoiceSnapshot; className?: string }) {
  const breakdown = taxLines(invoice.subtotal, invoice.taxes)

  return (
    <article className={`${card} p-8 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className={`${display.className} text-xl font-extrabold tracking-tight`}>{invoice.business.name}</p>
          <div className="mt-1 space-y-0.5 text-sm text-ink-2">
            {invoice.business.address && <p className="whitespace-pre-line">{invoice.business.address}</p>}
            {invoice.business.phone && <p>{invoice.business.phone}</p>}
            {invoice.business.email && <p>{invoice.business.email}</p>}
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
          <p className="text-meta font-medium text-ink-3">Bill to</p>
          <div className="mt-1 space-y-0.5 text-sm">
            <p className="font-semibold">{invoice.client?.name}</p>
            {invoice.client?.company && <p>{invoice.client.company}</p>}
            {invoice.client?.address && <p className="whitespace-pre-line text-ink-2">{invoice.client.address}</p>}
            {invoice.client?.email && <p className="text-ink-2">{invoice.client.email}</p>}
            {invoice.client?.taxId && <p className="text-ink-2">TIN: {invoice.client.taxId}</p>}
          </div>
        </div>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-8">
            <dt className="text-ink-2">Issued</dt>
            <dd className="font-medium">{formatDate(invoice.issueDate)}</dd>
          </div>
          <div className="flex justify-between gap-8">
            <dt className="text-ink-2">Due</dt>
            <dd className="font-medium">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</dd>
          </div>
          {invoice.projectName && (
            <div className="flex justify-between gap-8">
              <dt className="text-ink-2">Project</dt>
              <dd className="font-medium">{invoice.projectName}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line text-left text-ink-3">
            <tr>
              <th className="py-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Rate</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td className="py-3 pr-4">{item.description}</td>
                <td className="py-3 text-right tabular-nums">{qty(item.quantity)}</td>
                <td className="py-3 text-right tabular-nums">{peso(item.unitRate)}</td>
                <td className="py-3 text-right tabular-nums">{peso(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 ml-auto w-full max-w-xs space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-2">Subtotal</span>
          <span className="tabular-nums">{peso(invoice.subtotal)}</span>
        </div>
        {breakdown.map((tax) => (
          <div key={tax.label} className="flex justify-between">
            <span className="text-ink-2">
              {tax.label} ({formatPercent(tax.rate)})
            </span>
            <span className="tabular-nums">{peso(tax.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-line pt-2 font-bold">
          <span>Total</span>
          <span className={`${display.className} tabular-nums`}>{peso(invoice.total)}</span>
        </div>
        {invoice.amountPaid > 0 && (
          <>
            <div className="flex justify-between text-sprout-deep">
              <span>Amount paid</span>
              <span className="tabular-nums">−{peso(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <span>Balance due</span>
              <span className={`${display.className} tabular-nums`}>{peso(invoice.balance)}</span>
            </div>
          </>
        )}
      </div>

      {invoice.notes && (
        <div className="mt-8 border-t border-line pt-4 text-sm text-ink-2">
          <p className="font-semibold text-ink-2">Notes</p>
          <p className="mt-1 whitespace-pre-line">{invoice.notes}</p>
        </div>
      )}
    </article>
  )
}
