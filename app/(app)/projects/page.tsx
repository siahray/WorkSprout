import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { peso } from '@/lib/format'
import { btnPrimary, card, focus, tableHead, th, rowHover } from '@/lib/ui'

export const metadata: Metadata = {
  title: 'Projects · WorkSprout',
}

type ProjectRow = {
  id: string
  name: string
  status: string | null
  hourly_rate: number | string | null
  fixed_rate: number | string | null
  client: { name: string } | null
}

function rateLabel(p: ProjectRow): string {
  const parts = []
  if (p.hourly_rate != null) parts.push(`${peso(p.hourly_rate)}/hr`)
  if (p.fixed_rate != null) parts.push(`${peso(p.fixed_rate)} fixed`)
  return parts.length ? parts.join(' · ') : 'No rate'
}

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data } = await supabase
    .from('projects')
    .select('id, name, status, hourly_rate, fixed_rate, client:clients(name)')
    .order('created_at', { ascending: false })

  const projects = (data ?? []) as unknown as ProjectRow[]

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Projects" description="Group tasks, tracked time, and invoices under a client.">
          <Link href="/projects/new" className={`${btnPrimary} ${focus}`}>
            New project
          </Link>
        </PageHeader>
        <EmptyState
          title="No projects yet"
          description="Projects group the work you do for a client and set how it is billed."
          actionHref="/projects/new"
          actionLabel="Create a project"
        />
      </>
    )
  }

  return (
    <>
      <PageHeader title="Projects" description="Group tasks, tracked time, and invoices under a client.">
        <Link href="/projects/new" className={`${btnPrimary} ${focus}`}>
          New project
        </Link>
      </PageHeader>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={th}>Project</th>
                <th className={th}>Client</th>
                <th className={th}>Rate</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E2F27]/10">
              {projects.map((p) => (
                <tr key={p.id} className={rowHover}>
                  <td className="px-5 py-3.5">
                    <Link href={`/projects/${p.id}`} className={`font-semibold text-[#1F6B52] hover:underline ${focus}`}>
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[#0E2F27]/75">{p.client?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 tabular-nums text-[#0E2F27]/75">{rateLabel(p)}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.status ?? 'active'} />
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
