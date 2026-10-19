import { test, expect } from 'bun:test'
import {
  buildCashflow,
  buildPnl,
  buildTimesheet,
  summarizeTaxes,
} from '../lib/reports'

// ---------------------------------------------------------------------------
// Timesheet
// ---------------------------------------------------------------------------

test('buildTimesheet buckets minutes by Manila day, project rows by hours', () => {
  const from = '2026-10-19'
  const to = '2026-10-25'
  const timesheet = buildTimesheet(
    [
      // UTC instant on the 18th, but midnight Manila — belongs to Monday the 19th.
      { start_time: '2026-10-18T16:00:00Z', duration_minutes: 120, billable: true, project_name: 'Alpha' },
      { start_time: '2026-10-19T01:30:00Z', duration_minutes: 60, billable: false, project_name: 'Alpha' },
      { start_time: '2026-10-20T04:00:00Z', duration_minutes: 90, billable: true, project_name: 'Beta' },
      { start_time: '2026-10-19T06:00:00Z', duration_minutes: 30, billable: false, project_name: null },
      // A stray entry from the previous week must not land in any column.
      { start_time: '2026-10-12T04:00:00Z', duration_minutes: 500, billable: true, project_name: 'Alpha' },
      // A running (null-duration) entry contributes nothing.
      { start_time: '2026-10-21T04:00:00Z', duration_minutes: null, billable: true, project_name: 'Alpha' },
    ],
    from,
    to,
  )

  expect(timesheet.days).toHaveLength(7)
  // Rows sort by total hours: Alpha (180) then Beta (90) then Unassigned (30).
  expect(timesheet.rows.map((row) => row.label)).toEqual(['Alpha', 'Beta', 'Unassigned'])
  expect(timesheet.rows[0].cells).toEqual([180, 0, 0, 0, 0, 0, 0])
  expect(timesheet.rows[1].cells).toEqual([0, 90, 0, 0, 0, 0, 0])
  expect(timesheet.rows[2].cells).toEqual([30, 0, 0, 0, 0, 0, 0])
  expect(timesheet.dayTotals).toEqual([210, 90, 0, 0, 0, 0, 0])
  expect(timesheet.total).toBe(300)
  expect(timesheet.billableMinutes).toBe(210)
})

test('buildTimesheet on an empty range reports zeroes, not nulls', () => {
  const timesheet = buildTimesheet([], '2026-10-19', '2026-10-25')
  expect(timesheet.rows).toEqual([])
  expect(timesheet.dayTotals).toEqual([0, 0, 0, 0, 0, 0, 0])
  expect(timesheet.total).toBe(0)
  expect(timesheet.billableMinutes).toBe(0)
})

// ---------------------------------------------------------------------------
// P&L
// ---------------------------------------------------------------------------

const clients = [
  { id: 'c1', name: 'Alpha Corp' },
  { id: 'c2', name: 'Beta LLC' },
]
const projects = [
  { id: 'p1', client_id: 'c1' },
  { id: 'p2', client_id: null },
]

test('buildPnl attributes income by client and expenses through projects', () => {
  const pnl = buildPnl({
    invoices: [
      { client_id: 'c1', issue_date: '2026-10-05', total: 1000 },
      { client_id: 'c2', issue_date: '2026-10-06', total: '500' },
      { client_id: null, issue_date: '2026-10-07', total: 200 },
    ],
    expenses: [
      { spent_on: '2026-10-01', amount: 300, project_id: 'p1' }, // → c1
      { spent_on: '2026-10-02', amount: 100, project_id: 'p2' }, // project has no client → overhead
      { spent_on: '2026-10-03', amount: 50, project_id: null }, // no project → overhead
    ],
    clients,
    projects,
    clientFilter: null,
  })

  expect(pnl.income).toBe(1700)
  expect(pnl.expenses).toBe(450)
  expect(pnl.net).toBe(1250)
  expect(pnl.margin).toBe(73.53)

  // Breakdown: clients by income, then the Overhead row last.
  expect(pnl.rows.map((row) => row.label)).toEqual([
    'Alpha Corp',
    'Beta LLC',
    'Overhead',
  ])
  expect(pnl.rows[0]).toEqual({
    key: 'c1',
    label: 'Alpha Corp',
    income: 1000,
    expenses: 300,
    net: 700,
    margin: 70,
  })
  expect(pnl.rows[1].margin).toBe(100)
  expect(pnl.rows[2]).toEqual({
    key: 'overhead',
    label: 'Overhead',
    income: 0,
    expenses: 150,
    net: -150,
    margin: null, // no income, so no margin to speak of
  })
})

test('buildPnl with a client filter reports just that client, no breakdown', () => {
  const pnl = buildPnl({
    invoices: [
      { client_id: 'c1', issue_date: '2026-10-05', total: 1000 },
      { client_id: 'c2', issue_date: '2026-10-06', total: 500 },
    ],
    expenses: [
      { spent_on: '2026-10-01', amount: 300, project_id: 'p1' },
      { spent_on: '2026-10-03', amount: 50, project_id: null },
    ],
    clients,
    projects,
    clientFilter: 'c1',
  })

  expect(pnl.income).toBe(1000)
  expect(pnl.expenses).toBe(300)
  expect(pnl.net).toBe(700)
  expect(pnl.margin).toBe(70)
  expect(pnl.rows).toEqual([])
})

test('buildPnl on an empty account is all zeroes with no margin', () => {
  const pnl = buildPnl({
    invoices: [],
    expenses: [],
    clients: [],
    projects: [],
    clientFilter: null,
  })
  expect(pnl).toEqual({ income: 0, expenses: 0, net: 0, margin: null, rows: [] })
})

// ---------------------------------------------------------------------------
// Cash flow
// ---------------------------------------------------------------------------

test('buildCashflow buckets payments and expenses into the months of the range', () => {
  const cashflow = buildCashflow(
    [
      { paid_at: '2026-09-20', amount: 1000 },
      { paid_at: '2026-10-05', amount: '500' },
      { paid_at: '2026-11-01', amount: 999 }, // after the range
      { paid_at: '2026-08-31', amount: 50 }, // before the range
    ],
    [
      { spent_on: '2026-10-01', amount: 200 },
      { spent_on: '2026-09-10', amount: 50 }, // before the range start
    ],
    '2026-09-15',
    '2026-10-19',
  )

  expect(cashflow.buckets.map((bucket) => bucket.key)).toEqual(['2026-09', '2026-10'])
  expect(cashflow.buckets[0]).toEqual({ key: '2026-09', income: 1000, expenses: 0, net: 1000 })
  expect(cashflow.buckets[1]).toEqual({ key: '2026-10', income: 500, expenses: 200, net: 300 })
  expect(cashflow.income).toBe(1500)
  expect(cashflow.expenses).toBe(200)
  expect(cashflow.net).toBe(1300)
})

test('buildCashflow inside a single month yields one bucket', () => {
  const cashflow = buildCashflow([], [], '2026-10-01', '2026-10-19')
  expect(cashflow.buckets).toHaveLength(1)
  expect(cashflow.buckets[0].key).toBe('2026-10')
})

// ---------------------------------------------------------------------------
// Tax summary
// ---------------------------------------------------------------------------

test('summarizeTaxes groups by snapshotted label and rate, largest tax first', () => {
  const summary = summarizeTaxes(
    [
      { issue_date: '2026-10-05', subtotal: 1000, tax_amount: 120, taxes: [{ label: 'VAT', rate: 12 }] },
      {
        issue_date: '2026-10-06',
        subtotal: 200,
        tax_amount: 34, // 24 + 10, rounded per line
        taxes: [
          { label: 'VAT', rate: 12 },
          { label: 'Withholding', rate: 5 },
        ],
      },
      { issue_date: '2026-10-07', subtotal: 500, tax_amount: 0, taxes: [] },
      // Outside the period: ignored entirely.
      { issue_date: '2026-11-01', subtotal: 999, tax_amount: 99, taxes: [{ label: 'VAT', rate: 12 }] },
      // Garbage snapshots are dropped by coerceTaxes → counted as untaxed.
      { issue_date: '2026-10-08', subtotal: 100, tax_amount: 0, taxes: [{ label: '', rate: 0 }] },
    ],
    '2026-10-01',
    '2026-10-31',
  )

  expect(summary.lines).toEqual([
    { label: 'VAT', rate: 12, sales: 1200, tax: 144 },
    { label: 'Withholding', rate: 5, sales: 200, tax: 10 },
  ])
  expect(summary.untaxedSales).toBe(600)
  expect(summary.totalSales).toBe(1800)
  expect(summary.totalTax).toBe(154)
  // The breakdown foots to the total the invoices actually charged.
  expect(summary.lines.reduce((sum, line) => sum + line.tax, 0)).toBe(summary.totalTax)
})

test('summarizeTaxes on an empty period is all zeroes', () => {
  expect(summarizeTaxes([], '2026-10-01', '2026-10-31')).toEqual({
    lines: [],
    untaxedSales: 0,
    totalSales: 0,
    totalTax: 0,
  })
})
