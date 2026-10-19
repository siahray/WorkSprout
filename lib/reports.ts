// Pure report builders for /reports and the CSV exports.
//
// Each function takes rows that the route already filtered (by period, by
// status, by caller) and folds them into the shape the page renders and the
// export serialises — no fetching, no formatting, no side effects, so the
// money math is pinned by tests instead of eyeballed in a spreadsheet.
//
// Definitions used throughout:
//   income    = invoices issued in the period, drafts and voids excluded
//   collected = payments received in the period (cash-flow "in")
//   expenses  = expenses spent in the period, overhead included in totals
// Expenses are attributed to a client only through their project.

import { coerceTaxes, round2, taxLines } from './tax'
import { eachDay, manilaDayOf } from './period'

// ---------------------------------------------------------------------------
// Timesheet matrix (Time page · week/month view + export)
// ---------------------------------------------------------------------------

export type TimesheetEntryInput = {
  start_time: string
  duration_minutes: number | null
  billable: boolean
  project_name: string | null
}

export type TimesheetRow = {
  /** Project name; empty string for entries with no project. */
  key: string
  label: string
  /** Minutes worked on each day of the range, aligned with `days`. */
  cells: number[]
  /** Row total in minutes. */
  total: number
}

export type Timesheet = {
  days: string[]
  rows: TimesheetRow[]
  /** Minutes per day across all rows, aligned with `days`. */
  dayTotals: number[]
  total: number
  billableMinutes: number
}

export function buildTimesheet(
  entries: TimesheetEntryInput[],
  from: string,
  to: string,
): Timesheet {
  const days = eachDay(from, to)
  const column = new Map(days.map((day, index) => [day, index]))
  const byProject = new Map<string, number[]>()
  let billableMinutes = 0

  for (const entry of entries) {
    const day = manilaDayOf(entry.start_time)
    const index = column.get(day)
    // Belt and braces: the query is already bounded to the range in Manila
    // time, but a stray row must never land in the wrong column.
    if (index === undefined) continue
    const minutes = entry.duration_minutes ?? 0
    const key = entry.project_name ?? ''
    let cells = byProject.get(key)
    if (!cells) {
      cells = Array.from({ length: days.length }, () => 0)
      byProject.set(key, cells)
    }
    cells[index] += minutes
    if (entry.billable) billableMinutes += minutes
  }

  const rows: TimesheetRow[] = Array.from(byProject.entries(), ([key, cells]) => ({
    key,
    label: key || 'Unassigned',
    cells,
    total: cells.reduce((sum, minutes) => sum + minutes, 0),
  })).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label))

  const dayTotals = days.map((_, index) =>
    rows.reduce((sum, row) => sum + row.cells[index], 0),
  )

  return {
    days,
    rows,
    dayTotals,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    billableMinutes,
  }
}

// ---------------------------------------------------------------------------
// Profit & loss (Reports · per client and period)
// ---------------------------------------------------------------------------

export type PnlInvoice = {
  client_id: string | null
  issue_date: string
  total: number | string
}

export type PnlExpense = {
  spent_on: string
  amount: number | string
  project_id: string | null
}

export type PnlProject = { id: string; client_id: string | null }
export type PnlClient = { id: string; name: string }

export type PnlBreakdownRow = {
  /** Client id, or `overhead` for expenses no client owns. */
  key: string
  label: string
  income: number
  expenses: number
  net: number
  /** Net against income in percent; null when there is no income. */
  margin: number | null
}

export type Pnl = {
  income: number
  expenses: number
  net: number
  margin: number | null
  /** Per-client rows (plus an Overhead row); empty when a client is filtered. */
  rows: PnlBreakdownRow[]
}

export function buildPnl({
  invoices,
  expenses,
  clients,
  projects,
  clientFilter,
}: {
  invoices: PnlInvoice[]
  expenses: PnlExpense[]
  clients: PnlClient[]
  projects: PnlProject[]
  clientFilter: string | null
}): Pnl {
  const clientOfProject = new Map(projects.map((p) => [p.id, p.client_id]))

  const incomeByClient = new Map<string, number>()
  let income = 0
  for (const invoice of invoices) {
    const amount = Number(invoice.total)
    income += amount
    if (invoice.client_id) {
      incomeByClient.set(invoice.client_id, (incomeByClient.get(invoice.client_id) ?? 0) + amount)
    }
  }

  const expenseByClient = new Map<string, number>()
  let overhead = 0
  let totalExpenses = 0
  for (const expense of expenses) {
    const amount = Number(expense.amount)
    totalExpenses += amount
    const clientId = expense.project_id ? (clientOfProject.get(expense.project_id) ?? null) : null
    if (clientId) expenseByClient.set(clientId, (expenseByClient.get(clientId) ?? 0) + amount)
    else overhead += amount
  }

  if (clientFilter) {
    const own = incomeByClient.get(clientFilter) ?? 0
    const spent = expenseByClient.get(clientFilter) ?? 0
    return pnlSummary(own, spent, [])
  }

  const rows: PnlBreakdownRow[] = clients
    .map((client) => {
      const clientIncome = incomeByClient.get(client.id) ?? 0
      const clientExpenses = expenseByClient.get(client.id) ?? 0
      if (clientIncome <= 0 && clientExpenses <= 0) return null
      return breakdownRow(client.id, client.name, clientIncome, clientExpenses)
    })
    .filter((row): row is PnlBreakdownRow => row !== null)
    .sort((a, b) => b.income - a.income || b.expenses - a.expenses || a.label.localeCompare(b.label))

  if (overhead > 0) rows.push(breakdownRow('overhead', 'Overhead', 0, overhead))

  return pnlSummary(income, totalExpenses, rows)
}

function breakdownRow(key: string, label: string, income: number, expenses: number): PnlBreakdownRow {
  const net = round2(income - expenses)
  return {
    key,
    label,
    income: round2(income),
    expenses: round2(expenses),
    net,
    margin: income > 0 ? round2((net / income) * 100) : null,
  }
}

function pnlSummary(income: number, expenses: number, rows: PnlBreakdownRow[]): Pnl {
  const net = round2(income - expenses)
  return {
    income: round2(income),
    expenses: round2(expenses),
    net,
    margin: income > 0 ? round2((net / income) * 100) : null,
    rows,
  }
}

// ---------------------------------------------------------------------------
// Cash flow (Reports · monthly in/out)
// ---------------------------------------------------------------------------

export type CashflowBucket = {
  /** `YYYY-MM`. */
  key: string
  income: number
  expenses: number
  net: number
}

export type Cashflow = {
  buckets: CashflowBucket[]
  income: number
  expenses: number
  net: number
}

export function buildCashflow(
  payments: { paid_at: string; amount: number | string }[],
  expenses: { spent_on: string; amount: number | string }[],
  from: string,
  to: string,
): Cashflow {
  const bucketKeys: string[] = []
  for (let month = from.slice(0, 7); month <= to.slice(0, 7); month = nextMonth(month)) {
    bucketKeys.push(month)
  }
  const buckets = new Map<string, CashflowBucket>(
    bucketKeys.map((key) => [key, { key, income: 0, expenses: 0, net: 0 }]),
  )

  let totalIn = 0
  for (const payment of payments) {
    if (payment.paid_at < from || payment.paid_at > to) continue
    const bucket = buckets.get(payment.paid_at.slice(0, 7))
    if (!bucket) continue
    bucket.income += Number(payment.amount)
    totalIn += Number(payment.amount)
  }
  let totalOut = 0
  for (const expense of expenses) {
    if (expense.spent_on < from || expense.spent_on > to) continue
    const bucket = buckets.get(expense.spent_on.slice(0, 7))
    if (!bucket) continue
    bucket.expenses += Number(expense.amount)
    totalOut += Number(expense.amount)
  }

  for (const bucket of buckets.values()) {
    bucket.income = round2(bucket.income)
    bucket.expenses = round2(bucket.expenses)
    bucket.net = round2(bucket.income - bucket.expenses)
  }

  return {
    buckets: Array.from(buckets.values()),
    income: round2(totalIn),
    expenses: round2(totalOut),
    net: round2(totalIn - totalOut),
  }
}

function nextMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
  return next
}

// ---------------------------------------------------------------------------
// Tax summary (Reports · output tax per rate)
// ---------------------------------------------------------------------------

export type TaxInvoiceInput = {
  issue_date: string
  subtotal: number | string
  tax_amount: number | string
  taxes: unknown
}

export type TaxLine = {
  label: string
  rate: number
  sales: number
  tax: number
}

export type TaxSummary = {
  /** One row per snapshotted label+rate, largest tax first. */
  lines: TaxLine[]
  /** Sales on invoices that carry no tax. */
  untaxedSales: number
  totalSales: number
  totalTax: number
}

export function summarizeTaxes(
  invoices: TaxInvoiceInput[],
  from: string,
  to: string,
): TaxSummary {
  const lines = new Map<string, TaxLine>()
  let untaxedSales = 0
  let totalSales = 0
  let totalTax = 0

  for (const invoice of invoices) {
    if (invoice.issue_date < from || invoice.issue_date > to) continue
    const subtotal = Number(invoice.subtotal)
    const taxes = coerceTaxes(invoice.taxes)
    totalSales += subtotal
    // The stored total is what the invoice actually charged; the per-line
    // breakdown below re-derives it from the snapshot (same rules, same
    // rounding) so the table foots to it.
    totalTax += Number(invoice.tax_amount)
    if (taxes.length === 0) {
      untaxedSales += subtotal
      continue
    }
    for (const line of taxLines(subtotal, taxes)) {
      const key = `${line.label}|${line.rate}`
      const existing = lines.get(key)
      if (existing) {
        existing.sales += subtotal
        existing.tax += line.amount
      } else {
        lines.set(key, { label: line.label, rate: line.rate, sales: subtotal, tax: line.amount })
      }
    }
  }

  return {
    lines: Array.from(lines.values())
      .map((line) => ({ ...line, sales: round2(line.sales), tax: round2(line.tax) }))
      .sort((a, b) => b.tax - a.tax || a.label.localeCompare(b.label)),
    untaxedSales: round2(untaxedSales),
    totalSales: round2(totalSales),
    totalTax: round2(totalTax),
  }
}
