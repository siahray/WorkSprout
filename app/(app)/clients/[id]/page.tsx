import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { formatDate, peso } from '@/lib/format'
import { btnPrimary, btnSecondary, btnDanger, card, focus, tableHead, th, rowHover } from '@/lib/ui'
import { deleteClient, archiveClient, restoreClient } from '../actions'

export const metadata: Metadata = {
  title: 'Client · WorkSprout',
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="w-32 shrink-0 text-sm text-ink-3">{label}</dt>
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
        {client.archived_at && <StatusBadge status="archived" />}
        <Link href={`/clients/${id}/edit`} className={`${btnSecondary} ${focus}`}>
          Edit
        </Link>
        {!client.archived_at && (
          <Link href={`/projects/new?client_id=${id}`} className={`${btnPrimary} ${focus}`}>
            New project
          </Link>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-lg font-bold tracking-tight">Projects</h2>
            {projects.length === 0 ? (
              <div className={`${card} p-6 text-sm text-ink-2`}>
                No projects yet.
                {!client.archived_at && (
                  <>
                    {' '}
                    <Link href={`/projects/new?client_id=${id}`} className={`font-semibold text-sprout-deep hover:underline ${focus}`}>
                      Create one
                    </Link>
                    .
                  </>
                )}
              </div>
            ) : (
              <div className={`${card} divide-y divide-line`}>
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className={`flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-canvas/60 ${focus}`}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-ink-3 tabular-nums">
                        {[
                          p.hourly_rate != null ? `${peso(p.hourly_rate)}/hr` : null,
                          p.fixed_rate != null ? `${peso(p.fixed_rate)} fixed` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'No rate'}
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
              <div className={`${card} p-6 text-sm text-ink-2`}>No invoices for this client yet.</div>
            ) : (
              <div className={`${card} overflow-hidden`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className={tableHead}>
                      <tr>
                        <th className={th}>Invoice</th>
                        <th className={th}>Issued</th>
                        <th className={th}>Status</th>
                        <th className={`${th} text-right`}>Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className={rowHover}>
                          <td className="px-5 py-3.5 font-semibold">
                            <Link href={`/invoices/${inv.id}`} className={`text-sprout-deep hover:underline ${focus}`}>
                              {inv.number}
                            </Link>
                          </td>
                          <td className="px-5 py-3.5 text-ink-2">{formatDate(inv.issue_date)}</td>
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
            <h2 className="text-sm font-semibold text-ink-2">Details</h2>
            <dl className="mt-2 divide-y divide-line">
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Tax ID" value={client.tax_id} />
              <InfoRow label="Address" value={client.address} />
              <InfoRow label="Notes" value={client.notes} />
              <InfoRow label="Added" value={formatDate(client.created_at)} />
            </dl>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-ink-2">
              {client.archived_at ? 'Archived' : 'Archive'}
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              {client.archived_at
                ? `Out of your lists and pickers since ${formatDate(client.archived_at)}. Their projects, invoices, and time are untouched.`
                : 'Hide this client from lists and pickers without deleting anything. Their projects, invoices, and time stay exactly as they are.'}
            </p>
            <div className="mt-3">
              {client.archived_at ? (
                <ConfirmAction
                  action={restoreClient}
                  id={id}
                  message="Restore this client to your lists and pickers?"
                  className={btnSecondary}
                  errorClassName="mt-2 text-xs font-medium text-danger"
                >
                  Restore client
                </ConfirmAction>
              ) : (
                <ConfirmAction
                  action={archiveClient}
                  id={id}
                  message="Archive this client? They'll disappear from lists and pickers — nothing is deleted."
                  className={btnSecondary}
                  errorClassName="mt-2 text-xs font-medium text-danger"
                >
                  Archive client
                </ConfirmAction>
              )}
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className="text-sm font-semibold text-ink-2">Danger zone</h2>
            <p className="mt-2 text-sm text-ink-2">
              Deleting a client also deletes their projects and tasks.
            </p>
            <div className="mt-3">
              <ConfirmAction
                action={deleteClient}
                id={id}
                message="Delete this client and all of their projects and tasks?"
                className={btnDanger}
                errorClassName="mt-2 text-xs font-medium text-danger"
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
