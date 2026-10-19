import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { csvResponse, toCsv } from '@/lib/csv'
import { isUuid } from '@/lib/validation'
import { nowDateInput } from '@/lib/format'
import { resolveRange } from '@/lib/period'
import { buildCashflow, buildPnl, summarizeTaxes } from '@/lib/reports'
import { loadReportData } from '../data'

const SECTIONS = ['pnl', 'cashflow', 'tax'] as const
type Section = (typeof SECTIONS)[number]

/**
 * CSV for one section of the same report the page renders, fed by the same
 * loader and the same pure builders — the file can't drift from the screen.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return new Response('Unauthorized', { status: 401 })

  const params = request.nextUrl.searchParams
  const section = params.get('section') as Section | null
  if (!section || !SECTIONS.includes(section)) {
    return new Response('Unknown section', { status: 400 })
  }

  const range = resolveRange(params.get('from') ?? undefined, params.get('to') ?? undefined, nowDateInput())
  const clientFilter = params.get('client') && isUuid(params.get('client')!) ? params.get('client')! : null

  const rows = await loadReportData(supabase, range)
  if (!rows) return new Response('Failed to load report data', { status: 500 })

  let body: string
  if (section === 'pnl') {
    const pnl = buildPnl({
      invoices: rows.invoices,
      expenses: rows.expenses,
      clients: rows.clients,
      projects: rows.projects,
      clientFilter,
    })
    body = toCsv(
      ['client', 'income', 'expenses', 'net', 'margin_percent'],
      [
        ...pnl.rows.map((row) => [row.label, row.income, row.expenses, row.net, row.margin ?? '']),
        ['TOTAL', pnl.income, pnl.expenses, pnl.net, pnl.margin ?? ''],
      ],
    )
  } else if (section === 'cashflow') {
    const cashflow = buildCashflow(rows.payments, rows.expenses, range.from, range.to)
    body = toCsv(
      ['month', 'income', 'expenses', 'net'],
      [
        ...cashflow.buckets.map((bucket) => [bucket.key, bucket.income, bucket.expenses, bucket.net]),
        ['TOTAL', cashflow.income, cashflow.expenses, cashflow.net],
      ],
    )
  } else {
    const tax = summarizeTaxes(rows.invoices, range.from, range.to)
    body = toCsv(
      ['tax', 'rate_percent', 'sales', 'tax_amount'],
      [
        ...tax.lines.map((line) => [line.label, line.rate, line.sales, line.tax]),
        ['TOTAL (incl. untaxed)', '', tax.totalSales, tax.totalTax],
      ],
    )
  }

  return csvResponse(body, `worksprout-${section}-report`)
}
