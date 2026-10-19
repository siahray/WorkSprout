import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { loadReportData } from './data'
import { buildCashflow, buildPnl, summarizeTaxes } from '@/lib/reports'
import { isUuid } from '@/lib/validation'
import { addMonths, monthEnd, monthLabel, monthStart, resolveRange } from '@/lib/period'
import { formatPercent, formatDate, nowDateInput, peso } from '@/lib/format'
import { btnGhost, btnPrimary, card, focus, input, label, rowHover, tableHead, th } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Reports · WorkSprout',
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">{label}</p>
      <p className={`${display.className} mt-2 text-2xl font-extrabold leading-none tabular-nums`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-[#0E2F27]/55">{hint}</p>}
    </div>
  )
}

function SectionHead({
  eyebrow,
  title,
  csvHref,
}: {
  eyebrow: string
  title: string
  csvHref?: string
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1F6B52]">{eyebrow}</p>
        <h2 className={`${display.className} mt-1 text-xl font-extrabold tracking-tight`}>{title}</h2>
      </div>
      {csvHref && (
        <Link href={csvHref} className={`text-sm font-semibold text-[#1F6B52] hover:underline ${focus}`}>
          Export CSV
        </Link>
      )}
    </div>
  )
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; client?: string }>
}) {
  const { from: rawFrom, to: rawTo, client: rawClient } = await searchParams
  const today = nowDateInput()
  const range = resolveRange(rawFrom, rawTo, today)
  const clientFilter = rawClient && isUuid(rawClient) ? rawClient : null

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const data = await loadReportData(supabase, range)

  const clients = data?.clients ?? []
  const clientName = clientFilter
    ? (clients.find((client) => client.id === clientFilter)?.name ?? 'Selected client')
    : null
  const csvHref = (section: 'pnl' | 'cashflow' | 'tax') =>
    `/reports/export?section=${section}&from=${range.from}&to=${range.to}${
      clientFilter ? `&client=${clientFilter}` : ''
    }`

  const presets = (() => {
    const lastMonth = monthStart(addMonths(today, -1))
    return [
      { label: 'This month', from: monthStart(today), to: today },
      { label: 'Last month', from: lastMonth, to: monthEnd(lastMonth) },
      { label: 'This year', from: `${today.slice(0, 4)}-01-01`, to: today },
    ]
  })()

  const filterCard = (
    <form method="get" action="/reports" className={`${card} flex flex-wrap items-end gap-3 p-4`}>
      <div className="min-w-[150px]">
        <label htmlFor="from" className={label}>
          From
        </label>
        <input id="from" name="from" type="date" defaultValue={range.from} className={`mt-1.5 ${input}`} />
      </div>
      <div className="min-w-[150px]">
        <label htmlFor="to" className={label}>
          To
        </label>
        <input id="to" name="to" type="date" defaultValue={range.to} className={`mt-1.5 ${input}`} />
      </div>
      <div className="min-w-[180px]">
        <label htmlFor="client" className={label}>
          Client
        </label>
        <select id="client" name="client" defaultValue={clientFilter ?? ''} className={`mt-1.5 ${input}`}>
          <option value="">All clients</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={btnPrimary}>
        Apply
      </button>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Link
            key={preset.label}
            href={`/reports?from=${preset.from}&to=${preset.to}${clientFilter ? `&client=${clientFilter}` : ''}`}
            className={`${btnGhost} !px-3 !py-1.5 text-xs ${focus}`}
          >
            {preset.label}
          </Link>
        ))}
      </div>
    </form>
  )

  if (!data) {
    return (
      <>
        <PageHeader
          eyebrow="Financials"
          title="Reports"
          description="Profit and loss, cash flow, and taxes for any period."
        />
        {filterCard}
        <div className={`${card} mt-4 p-8 text-center text-sm text-[#0E2F27]/65`}>
          Couldn’t load the report data. Check your connection and try again — nothing below is
          rendered from a failed query.
        </div>
      </>
    )
  }

  const pnl = buildPnl({
    invoices: data.invoices,
    expenses: data.expenses,
    clients: data.clients,
    projects: data.projects,
    clientFilter,
  })
  const cashflow = buildCashflow(data.payments, data.expenses, range.from, range.to)
  const tax = summarizeTaxes(data.invoices, range.from, range.to)
  const hasActivity = pnl.income > 0 || pnl.expenses > 0 || cashflow.income > 0 || tax.lines.length > 0
  const maxFlow = Math.max(0, ...cashflow.buckets.map((bucket) => Math.max(bucket.income, bucket.expenses)))

  return (
    <>
      <PageHeader
        eyebrow="Financials"
        title="Reports"
        description="Profit and loss, cash flow, and taxes for any period."
      />

      {filterCard}

      <p className="mt-4 text-sm text-[#0E2F27]/55">
        {formatDate(range.from)} – {formatDate(range.to)} · {clientName ? `Client: ${clientName}` : 'All clients'}
      </p>

      {!hasActivity ? (
        <div className="mt-6">
          <EmptyState
            title="Nothing in this period"
            description="No invoices issued, payments received, or expenses spent in this window. Adjust the period or the client above."
          />
        </div>
      ) : (
        <>
          <section className="mt-10">
            <SectionHead
              eyebrow="Profit & loss"
              title="Income against expenses"
              csvHref={csvHref('pnl')}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Income" value={peso(pnl.income)} hint="Invoiced in period" accent="bg-[#2E9E6B]" />
              <Stat label="Expenses" value={peso(pnl.expenses)} hint="Spent in period" accent="bg-[#F4B63F]" />
              <Stat label="Net" value={peso(pnl.net)} accent="bg-[#0E2F27]/25" />
              <Stat
                label="Margin"
                value={pnl.margin === null ? '—' : formatPercent(pnl.margin)}
                hint="Net against income"
                accent="bg-[#0E2F27]/10"
              />
            </div>
            {pnl.rows.length > 0 ? (
              <div className={`${card} mt-4 overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={tableHead}>
                      <tr>
                        <th className={th}>Client</th>
                        <th className={`${th} text-right`}>Income</th>
                        <th className={`${th} text-right`}>Expenses</th>
                        <th className={`${th} text-right`}>Net</th>
                        <th className={`${th} text-right`}>Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0E2F27]/10">
                      {pnl.rows.map((row) => (
                        <tr key={row.key} className={rowHover}>
                          <td className="px-5 py-3.5 font-medium">{row.label}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums">{peso(row.income)}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums">{peso(row.expenses)}</td>
                          <td
                            className={`px-5 py-3.5 text-right tabular-nums ${
                              row.net < 0 ? 'font-medium text-red-700' : 'font-medium'
                            }`}
                          >
                            {peso(row.net)}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-[#0E2F27]/65">
                            {row.margin === null ? '—' : formatPercent(row.margin)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#0E2F27]/55">
                {clientName
                  ? `No income or expenses attributed to ${clientName} in this period.`
                  : 'No client-attributed activity in this period.'}
              </p>
            )}
          </section>

          <section className="mt-10">
            <SectionHead eyebrow="Cash flow" title="Money in and out" csvHref={csvHref('cashflow')} />
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Month</th>
                      <th className={`${th} text-right`}>In</th>
                      <th className={`${th} text-right`}>Out</th>
                      <th className={th}>Flow</th>
                      <th className={`${th} text-right`}>Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0E2F27]/10">
                    {cashflow.buckets.map((bucket) => (
                      <tr key={bucket.key} className={rowHover}>
                        <td className="px-5 py-3.5 font-medium whitespace-nowrap">{monthLabel(bucket.key)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-[#1F6B52]">
                          {peso(bucket.income)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums text-[#8a6412]">
                          {peso(bucket.expenses)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex w-28 flex-col gap-1">
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#0E2F27]/10">
                              <div
                                className="h-full rounded-full bg-[#2E9E6B]"
                                style={{ width: `${maxFlow ? Math.round((bucket.income / maxFlow) * 100) : 0}%` }}
                              />
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-[#0E2F27]/10">
                              <div
                                className="h-full rounded-full bg-[#F4B63F]"
                                style={{ width: `${maxFlow ? Math.round((bucket.expenses / maxFlow) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right tabular-nums ${
                            bucket.net < 0 ? 'font-medium text-red-700' : 'font-medium'
                          }`}
                        >
                          {peso(bucket.net)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#F4F8F5]">
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/55">
                        Total
                      </th>
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-[#1F6B52]">
                        {peso(cashflow.income)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold tabular-nums text-[#8a6412]">
                        {peso(cashflow.expenses)}
                      </td>
                      <td />
                      <td
                        className={`px-5 py-2.5 text-right font-bold tabular-nums ${
                          cashflow.net < 0 ? 'text-red-700' : ''
                        }`}
                      >
                        {peso(cashflow.net)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <SectionHead eyebrow="Taxes" title="Tax summary" csvHref={csvHref('tax')} />
            {tax.lines.length > 0 ? (
              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={tableHead}>
                      <tr>
                        <th className={th}>Tax</th>
                        <th className={`${th} text-right`}>Rate</th>
                        <th className={`${th} text-right`}>Sales</th>
                        <th className={`${th} text-right`}>Tax</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0E2F27]/10">
                      {tax.lines.map((line) => (
                        <tr key={`${line.label}|${line.rate}`} className={rowHover}>
                          <td className="px-5 py-3.5 font-medium">{line.label}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-[#0E2F27]/65">
                            {formatPercent(line.rate)}
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums">{peso(line.sales)}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums font-medium">{peso(line.tax)}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#F4F8F5]">
                        <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/55">
                          Total
                        </th>
                        <td />
                        <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                          {peso(tax.totalSales)}
                        </td>
                        <td className="px-5 py-2.5 text-right font-bold tabular-nums">{peso(tax.totalTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#0E2F27]/55">No taxed invoices issued in this period.</p>
            )}
            <p className="mt-3 text-xs text-[#0E2F27]/55">
              Output tax on invoices issued in the period — includes {peso(tax.untaxedSales)} of sales with
              no tax applied. BIR pre-filled forms aren’t generated yet; this summary is the filing input.
            </p>
          </section>
        </>
      )}
    </>
  )
}
