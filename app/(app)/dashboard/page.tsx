import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, hoursFromMinutes, nowDateInput, peso } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { card, btnPrimary, btnSecondary, focus, th, tableHead, rowHover } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Dashboard · WorkSprout',
}

type TodoRow = { id: string; title: string; completed_at: string | null }
type ProjectRow = { id: string; name: string; status: string | null; client: { name: string } | null }
type ClientRow = { id: string; name: string; company: string | null }

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent: string }) {
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">{label}</p>
      <p className={`${display.className} mt-2 text-[1.75rem] font-extrabold leading-none tabular-nums`}>{value}</p>
      {hint && <p className="mt-2 text-xs text-[#0E2F27]/55">{hint}</p>}
    </div>
  )
}

function Panel({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <div className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0E2F27]/50">{title}</h3>
        <Link href={href} className={`text-xs font-semibold text-[#1F6B52] hover:underline ${focus}`}>
          View all
        </Link>
      </div>
      <div className="mt-3">{children}</div>
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
  ] = await Promise.all([
    supabase
      .from('invoice_balances')
      .select('id, number, status, total, balance, issue_date, client_name')
      .order('created_at', { ascending: false }),
    supabase.from('payments').select('amount').gte('paid_at', monthStartIso),
    supabase.from('clients').select('id', { count: 'exact', head: true }),
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
    supabase.from('clients').select('id, name, company').order('name', { ascending: true }),
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

  if (clientsCount === 0 && invoices.length === 0) {
    return (
      <>
        <PageHeader eyebrow="Overview" title="Dashboard" description="Your clients, hours, and invoices at a glance." />
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
                className={`${display.className} flex h-8 w-8 items-center justify-center rounded-full bg-[#0E2F27] text-sm font-semibold text-white`}
              >
                {step.n}
              </span>
              <h3 className="mt-3 font-semibold">{step.t}</h3>
              <p className="mt-1 text-sm text-[#0E2F27]/65">{step.d}</p>
            </li>
          ))}
        </ol>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your clients, hours, and invoices at a glance."
      >
        <Link href="/invoices/new" className={`${btnPrimary} ${focus}`}>
          New invoice
        </Link>
        <Link href="/time" className={`${btnSecondary} ${focus}`}>
          Log time
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Outstanding"
          value={peso(outstanding)}
          hint="Sent and partly paid"
          accent="bg-[#F4B63F]"
        />
        <Stat label="Billed this month" value={peso(billedThisMonth)} accent="bg-[#0E2F27]/25" />
        <Stat label="Collected this month" value={peso(collectedThisMonth)} accent="bg-[#2E9E6B]" />
        <Stat
          label="Unbilled hours"
          value={hoursFromMinutes(unbilledMinutes)}
          hint={`${activeProjects} active project${activeProjects === 1 ? '' : 's'}`}
          accent="bg-[#0E2F27]/10"
        />
      </div>

      <section className={`${card} mt-10 overflow-hidden`}>
        <div className="grid divide-y divide-[#0E2F27]/10 md:grid-cols-3 md:divide-x md:divide-y-0">
          <Panel title="Today's to-dos" href="/focus">
            {todayTodos.length === 0 ? (
              <p className="text-sm text-[#0E2F27]/55">Nothing due today.</p>
            ) : (
              <ul className="space-y-2">
                {todayTodos.map((todo) => (
                  <li key={todo.id} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        todo.completed_at ? 'border-[#2E9E6B] bg-[#2E9E6B] text-white' : 'border-[#0E2F27]/30'
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
                      className={`min-w-0 flex-1 truncate text-sm ${
                        todo.completed_at ? 'text-[#0E2F27]/45 line-through' : 'text-[#0E2F27]'
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
              <p className="text-sm text-[#0E2F27]/55">No projects yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {topProjects.map((project) => (
                  <li key={project.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className={`min-w-0 flex-1 truncate text-sm font-medium hover:underline ${focus}`}
                    >
                      {project.name}
                    </Link>
                    {project.client?.name && (
                      <span className="shrink-0 text-xs text-[#0E2F27]/50">{project.client.name}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Clients" href="/clients">
            {clientsList.length === 0 ? (
              <p className="text-sm text-[#0E2F27]/55">No clients yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {clientsList.map((client) => (
                  <li key={client.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/clients/${client.id}`}
                      className={`min-w-0 flex-1 truncate text-sm font-medium hover:underline ${focus}`}
                    >
                      {client.name}
                    </Link>
                    {client.company && (
                      <span className="max-w-[50%] shrink-0 truncate text-xs text-[#0E2F27]/50">
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
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1F6B52]">Billing</p>
            <h2 className={`${display.className} mt-1 text-xl font-extrabold tracking-tight`}>Recent invoices</h2>
          </div>
          <Link href="/invoices" className={`text-sm font-semibold text-[#1F6B52] hover:underline ${focus}`}>
            View all
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className={`${card} p-8 text-center text-sm text-[#0E2F27]/65`}>
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
                <tbody className="divide-y divide-[#0E2F27]/10">
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
                          <Link href={`/invoices/${inv.id}`} className={`text-[#1F6B52] hover:underline ${focus}`}>
                            {inv.number}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-[#0E2F27]/75">{inv.client_name ?? '—'}</td>
                        <td className="px-5 py-3.5 tabular-nums text-[#0E2F27]/65">{formatDate(inv.issue_date)}</td>
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
