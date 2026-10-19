import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ListSearch } from '@/components/ui/list-search'
import { Pagination } from '@/components/ui/pagination'
import { clampedPage, pageCount, pageRange, parsePage, listHref } from '@/lib/pagination'
import { sanitizeSearch } from '@/lib/search'
import { formatDate, peso } from '@/lib/format'
import { btnPrimary, btnSecondary, card, focus, tableHead, th, rowHover } from '@/lib/ui'

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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const { q: rawQ, page: rawPage } = await searchParams
  const q = sanitizeSearch(rawQ)
  const page = parsePage(rawPage)
  const { from, to } = pageRange(page)

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const invoiceQuery = supabase
    .from('invoice_balances')
    .select('id, number, status, client_name, issue_date, due_date, total, balance', { count: 'exact' })
  const matching = q ? invoiceQuery.or(`number.ilike.%${q}%,client_name.ilike.%${q}%`) : invoiceQuery

  const [{ data, count }, { data: outstandingData }] = await Promise.all([
    matching.order('created_at', { ascending: false }).range(from, to),
    // Summed in the database: with pagination the page only ever sees one
    // slice of rows, and the header must keep reporting the real total owed.
    supabase.rpc('invoice_outstanding'),
  ])

  const invoices = (data ?? []) as InvoiceRow[]
  const total = count ?? 0
  const pages = pageCount(total)
  // ?page=999 on a 3-page list lands on page 3 instead of an empty table.
  if (total > 0 && page > pages) {
    redirect(listHref('/invoices', { q }, clampedPage(page, pages)))
  }

  const outstanding = Number(outstandingData ?? 0)
  // A search box is pointless (and a bit sad) on an empty account — unless
  // the search itself is what emptied it, in which case the box is the way out.
  const showSearch = total > 0 || q !== ''

  return (
    <>
      <PageHeader
        title="Invoices"
        description={outstanding > 0 ? `${peso(outstanding)} outstanding across your clients.` : 'Bill tracked time and fixed fees.'}
      >
        {total > 0 && (
          <Link
            href={q ? `/invoices/export?q=${encodeURIComponent(q)}` : '/invoices/export'}
            className={`${btnSecondary} ${focus}`}
          >
            Export CSV
          </Link>
        )}
        <Link href="/invoices/new" className={`${btnPrimary} ${focus}`}>
          New invoice
        </Link>
      </PageHeader>

      {showSearch && <ListSearch action="/invoices" q={q} placeholder="Invoice number or client" />}

      <div className={showSearch ? 'mt-4' : undefined}>
        {total === 0 ? (
          q ? (
            <EmptyState
              title="No invoices match"
              description={`Nothing here matches “${q}”. Try a different invoice number or client name.`}
            >
              <Link href="/invoices" className={`mt-6 ${btnSecondary} ${focus}`}>
                Clear search
              </Link>
            </EmptyState>
          ) : (
            <EmptyState
              title="No invoices yet"
              description="Track some billable time, then turn it into an invoice in a couple of clicks."
              actionHref="/invoices/new"
              actionLabel="Create an invoice"
            />
          )
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
            <Pagination page={page} pages={pages} basePath="/invoices" params={{ q }} />
          </div>
        )}
      </div>
    </>
  )
}
