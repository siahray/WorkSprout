import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { peso } from '@/lib/format'
import { btnPrimary, card, focus } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Clients · WorkSprout',
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const [clientsRes, projectsRes, balancesRes] = await Promise.all([
    supabase.from('clients').select('id, name, company, email').order('name', { ascending: true }),
    supabase.from('projects').select('id, client_id'),
    supabase.from('invoice_balances').select('client_id, balance').in('status', ['sent', 'partial']),
  ])

  const clients = clientsRes.data ?? []
  const projects = projectsRes.data ?? []
  const balances = balancesRes.data ?? []

  if (clients.length === 0) {
    return (
      <>
        <PageHeader title="Clients" description="The people and companies you work with.">
          <Link href="/clients/new" className={`${btnPrimary} ${focus}`}>
            Add client
          </Link>
        </PageHeader>
        <EmptyState
          title="No clients yet"
          description="Add your first client to start grouping projects, time, and invoices."
          actionHref="/clients/new"
          actionLabel="Add a client"
        />
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
      <PageHeader title="Clients" description="The people and companies you work with.">
        <Link href="/clients/new" className={`${btnPrimary} ${focus}`}>
          Add client
        </Link>
      </PageHeader>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F8F5] text-left text-[#0E2F27]/60">
              <tr>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 text-right font-medium">Projects</th>
                <th className="px-5 py-3 text-right font-medium">Outstanding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E2F27]/10">
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-[#F4F8F5]/60">
                  <td className="px-5 py-3.5">
                    <Link href={`/clients/${c.id}`} className={`font-semibold text-[#1F6B52] hover:underline ${focus}`}>
                      {c.name}
                    </Link>
                    {c.company && <p className="text-xs text-[#0E2F27]/55">{c.company}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-[#0E2F27]/75">{c.email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-[#0E2F27]/75">
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
