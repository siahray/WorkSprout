import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, peso } from '@/lib/format'
import { btnPrimary, btnSecondary, card, focus, tableHead, th, rowHover } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Clients · WorkSprout',
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>
}) {
  const { archived } = await searchParams
  const showArchived = archived === '1'

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const base = supabase.from('clients').select('id, name, company, email, created_at, archived_at')
  const [clientsRes, archivedCountRes, projectsRes, balancesRes] = await Promise.all([
    (showArchived ? base.not('archived_at', 'is', null) : base.is('archived_at', null)).order('name', {
      ascending: true,
    }),
    supabase.from('clients').select('id', { count: 'exact', head: true }).not('archived_at', 'is', null),
    supabase.from('projects').select('id, client_id'),
    supabase.from('invoice_balances').select('client_id, balance').in('status', ['sent', 'partial']),
  ])

  const clients = clientsRes.data ?? []
  const archivedCount = archivedCountRes.count ?? 0
  const projects = projectsRes.data ?? []
  const balances = balancesRes.data ?? []

  if (clients.length === 0) {
    return (
      <>
        <PageHeader
          title="Clients"
          description={
            showArchived
              ? 'Hidden from lists and pickers — open one to restore or delete it.'
              : 'The people and companies you work with.'
          }
        >
          {showArchived ? (
            <Link href="/clients" className={`${btnSecondary} ${focus}`}>
              Active clients
            </Link>
          ) : (
            archivedCount > 0 && (
              <Link href="/clients?archived=1" className={`${btnSecondary} ${focus}`}>
                Archived ({archivedCount})
              </Link>
            )
          )}
          <Link href="/clients/new" className={`${btnPrimary} ${focus}`}>
            Add client
          </Link>
        </PageHeader>
        {showArchived ? (
          <EmptyState
            title="No archived clients"
            description="Clients you archive will appear here, with everything they own intact."
            actionHref="/clients"
            actionLabel="View active clients"
          />
        ) : archivedCount > 0 ? (
          <EmptyState
            title="No active clients"
            description="Every client is archived. Restore one to work with it again."
            actionHref="/clients?archived=1"
            actionLabel="View archived clients"
          />
        ) : (
          <EmptyState
            title="No clients yet"
            description="Add your first client to start grouping projects, time, and invoices."
            actionHref="/clients/new"
            actionLabel="Add a client"
          />
        )}
      </>
    )
  }

  const projectCount = new Map<string, number>()
  for (const p of projects) {
    projectCount.set(p.client_id, (projectCount.get(p.client_id) ?? 0) + 1)
  }

  const outstanding = new Map<string, number>()
  for (const b of balances) {
    outstanding.set(b.client_id, (outstanding.get(b.client_id) ?? 0) + Number(b.balance))
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description={
          showArchived
            ? 'Hidden from lists and pickers — open one to restore or delete it.'
            : 'The people and companies you work with.'
        }
      >
        {showArchived ? (
          <Link href="/clients" className={`${btnSecondary} ${focus}`}>
            Active clients
          </Link>
        ) : (
          archivedCount > 0 && (
            <Link href="/clients?archived=1" className={`${btnSecondary} ${focus}`}>
              Archived ({archivedCount})
            </Link>
          )
        )}
        <Link href="/clients/new" className={`${btnPrimary} ${focus}`}>
          Add client
        </Link>
      </PageHeader>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Email</th>
                <th className={th}>{showArchived ? 'Archived' : 'Client since'}</th>
                <th className={`${th} text-right`}>Projects</th>
                <th className={`${th} text-right`}>Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {clients.map((c) => (
                <tr key={c.id} className={rowHover}>
                  <td className="px-5 py-3.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <Link href={`/clients/${c.id}`} className={`font-semibold text-sprout-deep hover:underline ${focus}`}>
                        {c.name}
                      </Link>
                      {showArchived && <StatusBadge status="archived" />}
                    </span>
                    {c.company && <p className="text-xs text-ink-3">{c.company}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-ink-2">{c.email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-ink-2">
                    {formatDate(showArchived && c.archived_at ? c.archived_at : c.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-ink-2">
                    {projectCount.get(c.id) ?? 0}
                  </td>
                  <td className="px-5 py-3.5 text-right tabular-nums font-medium">
                    {peso(outstanding.get(c.id) ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
