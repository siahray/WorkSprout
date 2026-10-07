import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, hoursFromMinutes, peso } from '@/lib/format'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { card, btnPrimary, btnSecondary, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Dashboard · WorkSprout',
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={`${card} p-5`}>
      <p className="text-sm text-[#0E2F27]/60">{label}</p>
      <p className={`${display.className} mt-1 text-2xl font-extrabold tabular-nums`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-[#0E2F27]/55">{hint}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthStartIso = monthStart.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })

  const [invoicesRes, paymentsRes, clientsRes, projectsRes, unbilledRes] = await Promise.all([
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
              <span className={`${display.className} flex h-8 w-8 items-center justify-center rounded-full bg-[#0E2F27] text-sm font-semibold text-white`}>
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
      <PageHeader title="Dashboard" description="Your clients, hours, and invoices at a glance.">
        <Link href="/invoices/new" className={`${btnPrimary} ${focus}`}>
          New invoice
        </Link>
        <Link href="/time" className={`${btnSecondary} ${focus}`}>
          Log time
        </Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Outstanding" value={peso(outstanding)} hint="Sent and partly paid" />
        <Stat label="Billed this month" value={peso(billedThisMonth)} />
        <Stat label="Collected this month" value={peso(collectedThisMonth)} />
        <Stat label="Unbilled hours" value={hoursFromMinutes(unbilledMinutes)} hint={`${activeProjects} active project${activeProjects === 1 ? '' : 's'}`} />
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`${display.className} text-xl font-extrabold tracking-tight`}>Recent invoices</h2>
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
                <thead className="bg-[#F4F8F5] text-left text-[#0E2F27]/60">
                  <tr>
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    <th className="px-5 py-3 font-medium">Client</th>
                    <th className="px-5 py-3 font-medium">Issued</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0E2F27]/10">
                  {recent.map((inv: { id: string; number: string; client_name: string | null; issue_date: string; status: string; total: string | number }) => (
                    <tr key={inv.id} className="hover:bg-[#F4F8F5]/60">
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
