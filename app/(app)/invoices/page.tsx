import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate, peso } from '@/lib/format'
import { btnPrimary, card, focus, tableHead, th, rowHover } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Invoices · WorkSprout',
}

type InvoiceRow = {
  id: string
  number: string
  status: string
  client_name: string | null
  issue_date: string
  due_date: string | null
  total: number | string
  balance: number | string
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data } = await supabase
    .from('invoice_balances')
    .select('id, number, status, client_name, issue_date, due_date, total, balance')
    .order('created_at', { ascending: false })

  const invoices = (data ?? []) as InvoiceRow[]
  const outstanding = invoices
    .filter((i) => i.status === 'sent' || i.status === 'partial')
    .reduce((sum, i) => sum + Number(i.balance), 0)

  return (
    <>
      <PageHeader
        title="Invoices"
        description={outstanding > 0 ? `${peso(outstanding)} outstanding across your clients.` : 'Bill tracked time and fixed fees.'}
      >
        <Link href="/invoices/new" className={`${btnPrimary} ${focus}`}>
          New invoice
        </Link>
      </PageHeader>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Track some billable time, then turn it into an invoice in a couple of clicks."
          actionHref="/invoices/new"
          actionLabel="Create an invoice"
        />
      ) : (
        <div className={`${card} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>Invoice</th>
                  <th className={th}>Client</th>
                  <th className={th}>Issued</th>
                  <th className={th}>Due</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Total</th>
                  <th className={`${th} text-right`}>Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0E2F27]/10">
                {invoices.map((inv) => (
                  <tr key={inv.id} className={rowHover}>
                    <td className="px-5 py-3.5 font-semibold">
                      <Link href={`/invoices/${inv.id}`} className={`text-[#1F6B52] hover:underline ${focus}`}>
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-[#0E2F27]/75">{inv.client_name ?? '—'}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-[#0E2F27]/65">{formatDate(inv.issue_date)}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap text-[#0E2F27]/65">{inv.due_date ? formatDate(inv.due_date) : '—'}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{peso(inv.total)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-medium">{peso(inv.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
