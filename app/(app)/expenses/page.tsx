import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { ExpenseForm } from './expense-form'
import { deleteExpense } from './actions'
import { categoryBadge } from '@/lib/expenses'
import { formatDate, nowDateInput, peso } from '@/lib/format'
import { btnDanger, card, focus, rowHover, tableHead, th, btnPrimary } from '@/lib/ui'
import { display } from '@/lib/fonts'
import Link from 'next/link'

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
  project: { name: string } | null
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const [expensesRes, projectsRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, description, category, amount, spent_on, note, project:projects(name)')
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('projects').select('id, name').order('name', { ascending: true }),
  ])

  const expenses = (expensesRes.data ?? []) as unknown as ExpenseRow[]
  const projects = (projectsRes.data ?? []) as { id: string; name: string }[]

  const monthStart = monthKey(nowDateInput())
  const thisMonth = expenses.filter((e) => monthKey(e.spent_on) === monthStart)
  const thisMonthTotal = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0)

  const groups = new Map<string, ExpenseRow[]>()
  for (const expense of expenses) {
    const key = monthKey(expense.spent_on)
    const list = groups.get(key) ?? []
    list.push(expense)
    groups.set(key, list)
  }

  return (
    <>
      <PageHeader
        eyebrow="Financials"
        title="Expenses"
        description="Subscriptions, internet, and hardware — the real cost of running your business."
      >
        <Link href="#add-expense" className={`${btnPrimary} ${focus}`}>
          Add expense
        </Link>
      </PageHeader>

      <div className={`${card} grid grid-cols-3 divide-x divide-[#0E2F27]/10`}>
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,480px)]">
        <section>
          {thisMonth.length === 0 && expenses.length === 0 ? (
            <div className={`${card} p-8 text-center text-sm text-[#0E2F27]/65`}>
              No expenses yet. Log your first subscription or purchase — it feeds the business health numbers on
              the dashboard.
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
                      <th className={`${th} text-right`}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0E2F27]/10">
                    {expenses.map((expense) => (
                      <tr key={expense.id} className={rowHover}>
                        <td className="px-5 py-3.5 whitespace-nowrap text-[#0E2F27]/65">{formatDate(expense.spent_on)}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-medium text-[#0E2F27]">{expense.description}</span>
                          {expense.note && <span className="block text-xs text-[#0E2F27]/50">{expense.note}</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={categoryBadge(expense.category)}>{expense.category}</span>
                        </td>
                        <td className="px-5 py-3.5 text-[#0E2F27]/75">{expense.project?.name ?? 'Overhead'}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{peso(expense.amount)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <ConfirmAction
                            action={deleteExpense}
                            id={expense.id}
                            message={`Delete "${expense.description}"? This cannot be undone.`}
                            className={`${btnDanger} px-2.5 py-1.5 text-xs`}
                          >
                            Delete
                          </ConfirmAction>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="self-start">
          <div id="add-expense" className={`${card} p-5`}>
            <h2 className={`${display.className} text-lg font-extrabold tracking-tight`}>Add expense</h2>
            <p className="mt-1 text-sm text-[#0E2F27]/55">
              Link a project to track its real profit margin.
            </p>
            <div className="mt-4">
              <ExpenseForm projects={projects} />
            </div>
          </div>
        </section>
      </div>
    </>
  )
}