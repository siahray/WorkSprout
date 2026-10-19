import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatPercent, hoursFromMinutes, nowDateInput, peso } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { card, btnPrimary, btnSecondary, focus, meta, panelHeader, panelTitle, th, tableHead, rowHover } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Dashboard · WorkSprout',
}

type TodoRow = { id: string; title: string; completed_at: string | null }
type ProjectRow = { id: string; name: string; status: string | null; client: { name: string } | null }
type ClientRow = { id: string; name: string; company: string | null }
type ExpenseRow = { amount: number | string; project_id: string | null; spent_on: string }
type MarginProject = {
  id: string
  name: string
  invoiced: number
  projectExpenses: number
  net: number
  pct: number
}

/**
 * One figure in the ledger strip. Monochrome on purpose — the strip is a
 * summary, and colour is held back for the health rows where it means
 * something. Figures are set in the display face so the numbers read as the
 * subject of the screen rather than as labels with values attached.
 */
function LedgerCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-panel px-5 py-4">
      <dt className={meta}>{label}</dt>
      <dd className={`${display.className} mt-2 text-figure font-extrabold tabular-nums text-ink`}>{value}</dd>
      {hint && <p className="mt-1.5 text-meta text-ink-3">{hint}</p>}
    </div>
  )
}

/**
 * One line of the month's figures. A definition list, not four more cards:
 * label left, figure right, a hairline between — the shape of a statement.
 */
function HealthRow({
  label,
  value,
  hint,
  tone = 'ink',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ink' | 'sprout' | 'danger'
}) {
  const colour = { ink: 'text-ink', sprout: 'text-sprout-deep', danger: 'text-danger' }[tone]
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3.5">
      <dt className="text-small text-ink-2">{label}</dt>
      <dd className="text-right">
        <span className={`text-lead font-semibold tabular-nums ${colour}`}>{value}</span>
        {hint && <span className="mt-0.5 block text-meta text-ink-3">{hint}</span>}
      </dd>
    </div>
  )
}

function Panel({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className={panelTitle}>{title}</h3>
        <Link href={href} className={`text-small font-medium text-sprout-deep hover:underline ${focus}`}>
          View all
        </Link>
      </div>
      <div className="mt-3.5">{children}</div>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')

  const userId = claims.sub
  const todayIso = nowDateInput()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartIso = monthStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

  const [
    invoicesRes,
    paymentsRes,
    clientsRes,
    projectsRes,
    unbilledRes,
    todayTodosRes,
    topProjectsRes,
    clientsListRes,
    expensesRes,
    marginProjectsRes,
  ] = await Promise.all([
    supabase
      .from('invoice_balances')
      .select('id, number, status, total, balance, issue_date, client_name, project_id')
      .order('created_at', { ascending: false }),
    supabase.from('payments').select('amount').gte('paid_at', monthStartIso),
    // Active clients only — the count matches the clients list and the panel below.
    supabase.from('clients').select('id', { count: 'exact', head: true }).is('archived_at', null),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('time_entries')
      .select('duration_minutes')
      .eq('billable', true)
      .is('invoice_id', null)
      .not('end_time', 'is', null),
    supabase
      .from('todos')
      .select('id, title, completed_at')
      .eq('user_id', userId)
      .eq('due_date', todayIso)
      .order('completed_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('projects')
      .select('id, name, status, client:clients(name)')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase.from('clients').select('id, name, company').is('archived_at', null).order('name', { ascending: true }),
    supabase.from('expenses').select('amount, project_id, spent_on'),
    supabase.from('projects').select('id, name').order('name', { ascending: true }),
  ])

  const invoices = invoicesRes.data ?? []
  const outstanding = invoices
    .filter((i: { status: string }) => i.status === 'sent' || i.status === 'partial')
    .reduce((sum: number, i: { balance: string | number }) => sum + Number(i.balance), 0)
  const billedThisMonth = invoices
    .filter((i: { status: string; issue_date: string }) => i.status !== 'void' && i.issue_date >= monthStartIso)
    .reduce((sum: number, i: { total: string | number }) => sum + Number(i.total), 0)
  const collectedThisMonth = (paymentsRes.data ?? []).reduce(
    (sum: number, p: { amount: string | number }) => sum + Number(p.amount),
    0
  )
  const unbilledMinutes = (unbilledRes.data ?? []).reduce(
    (sum: number, e: { duration_minutes: number | null }) => sum + (e.duration_minutes ?? 0),
    0
  )
const clientsCount = clientsRes.count ?? 0
const activeProjects = projectsRes.count ?? 0
const recent = invoices.slice(0, 5)
const todayTodos = (todayTodosRes.data ?? []) as TodoRow[]
const topProjects = (topProjectsRes.data ?? []) as unknown as ProjectRow[]
const clientsList = (clientsListRes.data ?? []) as ClientRow[]

const expensesAll = (expensesRes.data ?? []) as ExpenseRow[]
const expensesThisMonth = expensesAll
  .filter((e) => e.spent_on >= monthStartIso)
  .reduce((sum, e) => sum + Number(e.amount), 0)
const netThisMonth = collectedThisMonth - expensesThisMonth
const marginPercent =
  collectedThisMonth > 0 ? formatPercent((netThisMonth / collectedThisMonth) * 100) : '—'

const invoicedByProject = new Map<string, number>()
for (const inv of invoices) {
  const row = inv as { project_id: string | null; status: string }
  if (row.status === 'draft' || row.status === 'void' || !row.project_id) continue
  invoicedByProject.set(row.project_id, (invoicedByProject.get(row.project_id) ?? 0) + Number(inv.total))
}
const expensesByProject = new Map<string, number>()
for (const expense of expensesAll) {
  if (!expense.project_id) continue
  expensesByProject.set(expense.project_id, (expensesByProject.get(expense.project_id) ?? 0) + Number(expense.amount))
}
const marginProjects = ((marginProjectsRes.data ?? []) as { id: string; name: string }[])
  .map((project) => {
    const invoiced = invoicedByProject.get(project.id) ?? 0
    const projectExpenses = expensesByProject.get(project.id) ?? 0
    if (invoiced <= 0 && projectExpenses <= 0) return null
    const net = invoiced - projectExpenses
    const pct = invoiced > 0 ? Math.min(100, Math.max(0, Math.round((net / invoiced) * 1000) / 10)) : 0
    return { id: project.id, name: project.name, invoiced, projectExpenses, net, pct }
  })
  .filter((row): row is MarginProject => row !== null)
  .sort((a, b) => b.invoiced - a.invoiced)

  if (clientsCount === 0 && invoices.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="Your clients, hours, and invoices at a glance." />
        <EmptyState
          title="Start with your first client"
          description="Add a client, create a project for them, then track time and turn it into an invoice. Here is the loop."
          actionHref="/clients/new"
          actionLabel="Add a client"
        />
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { n: 1, t: 'Add a client', d: 'Their name, email, and company.' },
            { n: 2, t: 'Run a project', d: 'Set an hourly or fixed rate and add tasks.' },
            { n: 3, t: 'Invoice and get paid', d: 'Bill tracked hours or a fixed fee, then record payments.' },
          ].map((step) => (
            <li key={step.n} className={`${card} p-5`}>
              <span
                className={`${display.className} flex h-8 w-8 items-center justify-center rounded-control bg-ink text-small font-bold text-white`}
              >
                {step.n}
              </span>
              <h3 className="mt-3 text-body font-semibold text-ink">{step.t}</h3>
              <p className="mt-1 text-small leading-relaxed text-ink-2">{step.d}</p>
            </li>
          ))}
        </ol>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Your clients, hours, and invoices at a glance.">
        <Link href="/invoices/new" className={`${btnPrimary} ${focus}`}>
          New invoice
        </Link>
        <Link href="/time" className={`${btnSecondary} ${focus}`}>
          Log time
        </Link>
      </PageHeader>

      {/* One panel, four figures, hairlines between them: fewer containers than
          four separate cards, and the numbers line up as a column would. */}
      <section className={`${card} overflow-hidden`}>
        <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          <LedgerCell label="Outstanding" value={peso(outstanding)} hint="Sent and partly paid" />
          <LedgerCell label="Billed this month" value={peso(billedThisMonth)} />
          <LedgerCell label="Collected this month" value={peso(collectedThisMonth)} />
          <LedgerCell
            label="Unbilled hours"
            value={hoursFromMinutes(unbilledMinutes)}
            hint={`${activeProjects} active project${activeProjects === 1 ? '' : 's'}`}
          />
        </dl>
      </section>

      <section className="mt-10">
        <h2 className={`${display.className} mb-4 text-title font-extrabold tracking-tight text-ink`}>
          Business health
        </h2>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* The month's profit as one statement — collected, expenses, net,
              margin — rather than four more cards repeating the strip. */}
          <div className={`${card} self-start lg:col-span-1`}>
            <div className={panelHeader}>
              <h3 className={panelTitle}>This month</h3>
              <Link href="/expenses" className={`text-small font-medium text-sprout-deep hover:underline ${focus}`}>
                Expenses
              </Link>
            </div>
            <dl className="divide-y divide-line">
              <HealthRow label="Collected" value={peso(collectedThisMonth)} tone="sprout" />
              <HealthRow label="Expenses" value={peso(expensesThisMonth)} />
              <HealthRow
                label="Net"
                value={peso(netThisMonth)}
                tone={netThisMonth >= 0 ? 'ink' : 'danger'}
                hint={netThisMonth < 0 ? 'Spending more than you collect' : 'Collected minus expenses'}
              />
              <HealthRow
                label="Margin"
                value={marginPercent}
                hint={collectedThisMonth > 0 ? 'Net against collected' : undefined}
              />
            </dl>
          </div>

          <div className={`${card} overflow-hidden lg:col-span-2`}>
            <div className={panelHeader}>
              <h3 className={panelTitle}>Margin by project</h3>
              <Link href="/projects" className={`text-small font-medium text-sprout-deep hover:underline ${focus}`}>
                All projects
              </Link>
            </div>
            {marginProjects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={tableHead}>
                    <tr>
                      <th className={th}>Project</th>
                      <th className={`${th} text-right`}>Invoiced</th>
                      <th className={`${th} text-right`}>Expenses</th>
                      <th className={`${th} text-right`}>Net</th>
                      <th className={th}>Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {marginProjects.map((project) => (
                      <tr key={project.id} className={rowHover}>
                        <td className="px-5 py-3.5 font-medium">
                          <Link
                            href={`/projects/${project.id}`}
                            className={`text-sprout-deep hover:underline ${focus}`}
                          >
                            {project.name}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{peso(project.invoiced)}</td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{peso(project.projectExpenses)}</td>
                        <td
                          className={`px-5 py-3.5 text-right font-medium tabular-nums ${
                            project.net < 0 ? 'text-danger' : ''
                          }`}
                        >
                          {peso(project.net)}
                        </td>
                        <td className="px-5 py-3.5">
                          {project.invoiced > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                                <div
                                  className={`animate-bar-in h-full rounded-full ${
                                    project.net < 0 ? 'bg-mango' : 'bg-sprout'
                                  }`}
                                  style={{ width: `${project.pct}%` }}
                                />
                              </div>
                              <span className="text-meta tabular-nums text-ink-3">{project.pct}%</span>
                            </div>
                          ) : (
                            <span className="text-meta text-ink-4">No billings</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-small text-ink-3">
                No billings yet — margins appear once a project has an invoice or an expense.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={`${card} mt-10 overflow-hidden`}>
        <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          <Panel title="Today's to-dos" href="/focus">
            {todayTodos.length === 0 ? (
              <p className="text-small text-ink-3">Nothing due today.</p>
            ) : (
              <ul className="space-y-2">
                {todayTodos.map((todo) => (
                  <li key={todo.id} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        todo.completed_at ? 'border-sprout bg-sprout text-white' : 'border-line-strong'
                      }`}
                    >
                      {todo.completed_at && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate text-small ${
                        todo.completed_at ? 'text-ink-4 line-through' : 'text-ink'
                      }`}
                    >
                      {todo.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Projects" href="/projects">
            {topProjects.length === 0 ? (
              <p className="text-small text-ink-3">No projects yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {topProjects.map((project) => (
                  <li key={project.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className={`min-w-0 flex-1 truncate text-small font-medium hover:underline ${focus}`}
                    >
                      {project.name}
                    </Link>
                    {project.client?.name && (
                      <span className="shrink-0 text-meta text-ink-3">{project.client.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Clients" href="/clients">
            {clientsList.length === 0 ? (
              <p className="text-small text-ink-3">No clients yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {clientsList.map((client) => (
                  <li key={client.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className={`min-w-0 flex-1 truncate text-small font-medium hover:underline ${focus}`}
                    >
                      {client.name}
                    </Link>
                    {client.company && (
                      <span className="max-w-[50%] shrink-0 truncate text-meta text-ink-3">
                        {client.company}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>

      <div className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className={`${display.className} text-title font-extrabold tracking-tight text-ink`}>Recent invoices</h2>
          <Link href="/invoices" className={`text-small font-medium text-sprout-deep hover:underline ${focus}`}>
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className={`${card} p-8 text-center text-small text-ink-3`}>
            No invoices yet. Track some time, then create your first invoice.
          </div>
        ) : (
          <div className={`${card} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={tableHead}>
                  <tr>
                    <th className={th}>Invoice</th>
                    <th className={th}>Client</th>
                    <th className={th}>Issued</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {recent.map(
                    (inv: {
                      id: string
                      number: string
                      client_name: string | null
                      issue_date: string
                      status: string
                      total: string | number
                    }) => (
                      <tr key={inv.id} className={rowHover}>
                        <td className="px-5 py-3.5 font-semibold">
                          <Link href={`/invoices/${inv.id}`} className={`text-sprout-deep hover:underline ${focus}`}>
                            {inv.number}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-ink-2">{inv.client_name ?? '—'}</td>
                        <td className="px-5 py-3.5 tabular-nums text-ink-3">{formatDate(inv.issue_date)}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">{peso(inv.total)}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
