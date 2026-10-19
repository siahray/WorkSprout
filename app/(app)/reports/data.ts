import { createClient } from '@/lib/supabase/server'
import type { DateRange } from '@/lib/period'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type ReportInvoiceRow = {
  client_id: string | null
  issue_date: string
  status: string
  subtotal: number | string
  tax_amount: number | string
  total: number | string
  taxes: unknown
}

export type ReportPaymentRow = { paid_at: string; amount: number | string }
export type ReportExpenseRow = {
  spent_on: string
  amount: number | string
  project_id: string | null
}
export type ReportProjectRow = { id: string; client_id: string | null }
export type ReportClientRow = { id: string; name: string }

export type ReportData = {
  invoices: ReportInvoiceRow[]
  payments: ReportPaymentRow[]
  expenses: ReportExpenseRow[]
  projects: ReportProjectRow[]
  clients: ReportClientRow[]
}

/**
 * One fetch for everything /reports renders and exports, so the page and the
 * CSV route can never disagree about the same period. Income-side invoices
 * arrive already excluding drafts and voids (the P&L definition); clients
 * include archived ones so every historical invoice still maps to a name and
 * the per-client breakdown always foots to the totals.
 *
 * Returns null on any query error — a report of zeroes produced by a failed
 * query would be a lie about money, so callers show the failure instead.
 */
export async function loadReportData(supabase: Supabase, range: DateRange): Promise<ReportData | null> {
  const [invoicesRes, paymentsRes, expensesRes, projectsRes, clientsRes] = await Promise.all([
    supabase
      .from('invoice_balances')
      .select('client_id, issue_date, status, subtotal, tax_amount, total, taxes')
      .gte('issue_date', range.from)
      .lte('issue_date', range.to)
      .not('status', 'in', '(draft,void)')
      .order('issue_date', { ascending: true }),
    supabase
      .from('payments')
      .select('paid_at, amount')
      .gte('paid_at', range.from)
      .lte('paid_at', range.to)
      .order('paid_at', { ascending: true }),
    supabase
      .from('expenses')
      .select('spent_on, amount, project_id')
      .gte('spent_on', range.from)
      .lte('spent_on', range.to)
      .order('spent_on', { ascending: true }),
    supabase.from('projects').select('id, client_id'),
    supabase.from('clients').select('id, name').order('name', { ascending: true }),
  ])

  if (
    invoicesRes.error ||
    paymentsRes.error ||
    expensesRes.error ||
    projectsRes.error ||
    clientsRes.error
  ) {
    return null
  }

  return {
    invoices: (invoicesRes.data ?? []) as unknown as ReportInvoiceRow[],
    payments: (paymentsRes.data ?? []) as ReportPaymentRow[],
    expenses: (expensesRes.data ?? []) as ReportExpenseRow[],
    projects: (projectsRes.data ?? []) as ReportProjectRow[],
    clients: (clientsRes.data ?? []) as ReportClientRow[],
  }
}
