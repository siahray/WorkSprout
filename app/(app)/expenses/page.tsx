import { Fragment } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { AddExpenseDialog } from './add-expense-dialog'
import { EditExpenseDialog } from './edit-expense-dialog'
import { ReceiptsDialog } from './receipts-dialog'
import { deleteExpense } from './actions'
import type { Attachment } from '@/lib/attachments'
import { categoryBadge } from '@/lib/expenses'
import { formatDate, nowDateInput, peso } from '@/lib/format'
import { btnAccent, btnGhost, card, focus, rowHover, tableHead, th } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Expenses · WorkSprout',
}

type ExpenseRow = {
  id: string
  description: string
  category: string
  amount: number | string
  spent_on: string
  note: string | null
  project_id: string | null
  project: { name: string } | null
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

// "2026-10" -> "October 2026", built from local parts so no timezone can shift it.
function monthLabel(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })
}

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const [expensesRes, projectsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, description, category, amount, spent_on, note, project_id, project:projects(name)')
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name', { ascending: true }),
  ])

  const expenses = (expensesRes.data ?? []) as unknown as ExpenseRow[]
  const projects = (projectsRes.data ?? []) as { id: string; name: string }[]

  // Receipts for the rows on this page, grouped per expense for the row dialogs.
  const expenseIds = expenses.map((expense) => expense.id)
  const receiptsRes = expenseIds.length
    ? await supabase
        .from('attachments')
        .select('id, expense_id, name, path, mime_type, size_bytes, created_at')
        .in('expense_id', expenseIds)
        .order('created_at', { ascending: false })
    : { data: [] }
  const receiptsByExpense = new Map<string, Attachment[]>()
  for (const attachment of (receiptsRes.data ?? []) as unknown as (Attachment & { expense_id: string })[]) {
    const list = receiptsByExpense.get(attachment.expense_id) ?? []
    list.push(attachment)
    receiptsByExpense.set(attachment.expense_id, list)
  }

  const monthStart = monthKey(nowDateInput())
  const thisMonth = expenses.filter((e) => monthKey(e.spent_on) === monthStart)
  const thisMonthTotal = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0)

  // Expenses arrive newest-first, so insertion order gives newest month first.
  const months = new Map<string, ExpenseRow[]>()
  for (const expense of expenses) {
    const key = monthKey(expense.spent_on)
    const list = months.get(key) ?? []
    list.push(expense)
    months.set(key, list)
  }

  return (
    <>
      <PageHeader
        eyebrow="Financials"
        title="Expenses"
        description="Subscriptions, internet, and hardware — the real cost of running your business."
      >
        <AddExpenseDialog projects={projects} />
      </PageHeader>

      <div className={`${card} grid grid-cols-1 divide-y divide-[#0E2F27]/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0`}>
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">This month</p>
          <p className={`${display.className} mt-2 text-2xl font-extrabold leading-none tabular-nums`}>
            {peso(thisMonthTotal)}
          </p>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">Entries</p>
          <p className={`${display.className} mt-2 text-2xl font-extrabold leading-none tabular-nums`}>
            {expenses.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">Total recorded</p>
          <p className={`${display.className} mt-2 text-2xl font-extrabold leading-none tabular-nums`}>
            {peso(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
          </p>
        </div>
      </div>

      <div className="mt-8">
        {expenses.length === 0 ? (
          <div className={`${card} flex flex-col items-center gap-4 p-10 text-center`}>
            <div className="text-sm text-[#0E2F27]/65">
              No expenses yet. Log your first subscription or purchase — it feeds the business health numbers on
              the dashboard.
            </div>
            <AddExpenseDialog
              projects={projects}
              label="Add your first expense"
              className={`${btnAccent} ${focus}`}
            />
          </div>
        ) : (
          <div className={`${card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Date</th>
                    <th className={th}>Description</th>
                    <th className={th}>Category</th>
                    <th className={th}>Project</th>
                    <th className={`${th} text-right`}>Amount</th>
                    <th className={th}></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E2F27]/10">
                  {Array.from(months.entries()).map(([key, rows]) => {
                    const subtotal = rows.reduce((sum, e) => sum + Number(e.amount), 0)
                    return (
                      <Fragment key={key}>
                        <tr className="bg-[#F4F8F5]">
                          <th colSpan={6} className="px-5 py-2.5 text-left">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/55">
                              {monthLabel(key)}
                            </span>
                            <span className="ml-3 text-xs font-normal tabular-nums text-[#0E2F27]/55">
                              {rows.length} {rows.length === 1 ? 'expense' : 'expenses'} · {peso(subtotal)}
                            </span>
                          </th>
                        </tr>
                        {rows.map((expense) => (
                          <tr key={expense.id} className={rowHover}>
                            <td className="px-5 py-3.5 whitespace-nowrap text-[#0E2F27]/65">
                              {formatDate(expense.spent_on)}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-medium text-[#0E2F27]">{expense.description}</span>
                              {expense.note && (
                                <span className="block text-xs text-[#0E2F27]/50">{expense.note}</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={categoryBadge(expense.category)}>{expense.category}</span>
                            </td>
                            <td className="px-5 py-3.5 text-[#0E2F27]/75">{expense.project?.name ?? 'Overhead'}</td>
                            <td className="px-5 py-3.5 text-right tabular-nums">{peso(expense.amount)}</td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="flex items-center justify-end gap-1">
                                <ReceiptsDialog
                                  expenseId={expense.id}
                                  description={expense.description}
                                  attachments={receiptsByExpense.get(expense.id) ?? []}
                                />
                                <EditExpenseDialog
                                  expense={{
                                    id: expense.id,
                                    description: expense.description,
                                    category: expense.category,
                                    amount: expense.amount,
                                    spent_on: expense.spent_on,
                                    note: expense.note,
                                    project_id: expense.project_id,
                                  }}
                                  projects={projects}
                                />
                                <ConfirmAction
                                  action={deleteExpense}
                                  id={expense.id}
                                  message={`Delete "${expense.description}"? This cannot be undone.`}
                                  className={`${btnGhost} !px-2.5 !py-1.5 text-xs text-red-700 hover:text-red-800`}
                                >
                                  Delete
                                </ConfirmAction>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
