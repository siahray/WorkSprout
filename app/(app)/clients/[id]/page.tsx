import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { formatDate, peso } from '@/lib/format'
import { btnPrimary, btnSecondary, btnDanger, card, focus } from '@/lib/ui'
import { deleteClient } from '../actions'

export const metadata: Metadata = {
  title: 'Client · WorkSprout',
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-32 shrink-0 text-sm text-[#0E2F27]/55">{label}</dt>
      <dd className="text-sm font-medium whitespace-pre-line">{value || '—'}</dd>
    </div>
  )
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data: client } = await supabase.from('clients').select('*').eq('id', id).maybeSingle()
  if (!client) notFound()

  const [projectsRes, invoicesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, hourly_rate, fixed_rate')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoice_balances')
      .select('id, number, status, total, balance, issue_date')
      .eq('client_id', id)
      .order('created_at', { ascending: false }),
  ])

  const projects = projectsRes.data ?? []
  const invoices = invoicesRes.data ?? []

  return (
    <>
      <PageHeader title={client.name} description={client.company ?? undefined}>
        <Link href={`/clients/${id}/edit`} className={`${btnSecondary} ${focus}`}>
          Edit
        </Link>
        <Link href={`/projects/new?client_id=${id}`} className={`${btnPrimary} ${focus}`}>
          New project
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">Projects</h2>
            {projects.length === 0 ? (
              <div className={`${card} p-6 text-sm text-[#0E2F27]/65`}>
                No projects yet.{' '}
                <Link href={`/projects/new?client_id=${id}`} className={`font-semibold text-[#1F6B52] hover:underline ${focus}`}>
                  Create one
                </Link>
                .
              </div>
            ) : (
              <div className={`${card} divide-y divide-[#0E2F27]/10`}>
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className={`flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#F4F8F5]/60 ${focus}`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-[#0E2F27]/55 tabular-nums">
                        {p.hourly_rate != null
                          ? `${peso(p.hourly_rate)}/hr`
                          : p.fixed_rate != null
                            ? `${peso(p.fixed_rate)} fixed`
                            : 'No rate'}
                      </span>
                      <StatusBadge status={p.status ?? 'active'} />
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">Invoices</h2>
            {invoices.length === 0 ? (
              <div className={`${card} p-6 text-sm text-[#0E2F27]/65`}>No invoices for this client yet.</div>
            ) : (
              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[#F4F8F5] text-left text-[#0E2F27]/60">
                      <tr>
                        <th className="px-5 py-3 font-medium">Invoice</th>
                        <th className="px-5 py-3 font-medium">Issued</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#0E2F27]/10">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-[#F4F8F5]/60">
                          <td className="px-5 py-3.5 font-semibold">
                            <Link href={`/invoices/${inv.id}`} className={`text-[#1F6B52] hover:underline ${focus}`}>
                              {inv.number}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-[#0E2F27]/65">{formatDate(inv.issue_date)}</td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={inv.status} />
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums">{peso(inv.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-[#0E2F27]/60">Details</h2>
            <dl className="mt-2 divide-y divide-[#0E2F27]/10">
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Tax ID" value={client.tax_id} />
              <InfoRow label="Address" value={client.address} />
              <InfoRow label="Notes" value={client.notes} />
              <InfoRow label="Added" value={formatDate(client.created_at)} />
            </dl>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-[#0E2F27]/60">Danger zone</h2>
            <p className="mt-2 text-sm text-[#0E2F27]/65">
              Deleting a client also deletes their projects and tasks.
            </p>
            <div className="mt-3">
              <ConfirmAction
                action={deleteClient}
                id={id}
                message="Delete this client and all of their projects and tasks?"
                className={btnDanger}
                errorClassName="mt-2 text-xs font-medium text-red-700"
              >
                Delete client
              </ConfirmAction>
            </div>
          </section>
        </aside>
      </div>
    </>
  )
}
