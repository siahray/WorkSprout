import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSearch } from '@/lib/search'
import { csvResponse, toCsv } from '@/lib/csv'
import { fetchAll } from '@/lib/export'

const HEADER = [
  'invoice',
  'client',
  'project',
  'issued',
  'due',
  'status',
  'subtotal',
  'tax',
  'total',
  'paid',
  'balance',
  'sent_at',
]

type InvoiceRow = {
  number: string
  client_name: string | null
  project_name: string | null
  issue_date: string
  due_date: string | null
  status: string
  subtotal: number | string
  tax_amount: number | string
  total: number | string
  amount_paid: number | string
  balance: number | string
  sent_at: string | null
}

/**
 * CSV of every invoice matching the list's ?q= search, straight from the
 * balance view, so totals/paid/balance agree with what the table shows.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return new Response('Unauthorized', { status: 401 })

  const q = sanitizeSearch(request.nextUrl.searchParams.get('q') ?? undefined)

  const rows = await fetchAll<InvoiceRow>((from, to) => {
    const query = supabase
      .from('invoice_balances')
      .select(
        'number, client_name, project_name, issue_date, due_date, status, subtotal, tax_amount, total, amount_paid, balance, sent_at',
      )
      .order('created_at', { ascending: false })
    const matching = q ? query.or(`number.ilike.%${q}%,client_name.ilike.%${q}%`) : query
    return matching.range(from, to)
  })
  if (!rows) return new Response('Failed to load invoices', { status: 500 })

  const body = toCsv(
    HEADER,
    rows.map((row) => [
      row.number,
      row.client_name,
      row.project_name,
      row.issue_date,
      row.due_date,
      row.status,
      row.subtotal,
      row.tax_amount,
      row.total,
      row.amount_paid,
      row.balance,
      row.sent_at,
    ]),
  )
  return csvResponse(body, 'worksprout-invoices')
}
