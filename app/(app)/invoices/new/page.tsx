import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { InvoiceBuilder, type UnbilledGroup } from '../invoice-builder'
import { coerceTaxes } from '@/lib/tax'
import { createInvoice } from '../actions'
import { isUuid } from '@/lib/validation'

export const metadata: Metadata = {
  title: 'New invoice · WorkSprout',
}

type UnbilledRow = {
  id: string
  duration_minutes: number | null
  task:
    | {
        title: string
        project:
          | {
              id: string
              name: string
              hourly_rate: number | string | null
              fixed_rate: number | string | null
              client_id: string
            }
          | null
      }
    | null
}

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string; project_id?: string }>
}) {
  const { client_id, project_id } = await searchParams
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  // Same preselect rule as new projects: a deep-linked client stays in the
  // list even if archived, so the builder shows who it is and createInvoice
  // can refuse with a clear message instead of billing someone else.
  const preselect = typeof client_id === 'string' && isUuid(client_id) ? client_id : null
  const clientQuery = supabase.from('clients').select('id, name').order('name', { ascending: true })
  const [clientsRes, projectsRes, unbilledRes, profileRes] = await Promise.all([
    preselect ? clientQuery.or(`archived_at.is.null,id.eq.${preselect}`) : clientQuery.is('archived_at', null),
    supabase.from('projects').select('id, name, client_id').order('name', { ascending: true }),
    supabase
      .from('time_entries')
      .select(
        'id, duration_minutes, task:tasks(title, project:projects(id, name, hourly_rate, fixed_rate, client_id))',
      )
      .eq('billable', true)
      .is('invoice_id', null)
      .not('end_time', 'is', null),
    supabase.from('profiles').select('taxes').eq('id', claimsData.claims.sub).maybeSingle(),
  ])

  const clients = clientsRes.data ?? []
  const projects = projectsRes.data ?? []

  if (clients.length === 0) {
    return (
      <>
        <PageHeader title="New invoice" description="Bill tracked time and fixed fees to a client." />
        <EmptyState
          title="Add a client first"
          description="Invoices are addressed to a client. Create one, then come back to bill your work."
          actionHref="/clients/new"
          actionLabel="Add a client"
        />
      </>
    )
  }

const groups = new Map<string, UnbilledGroup>()
  for (const row of (unbilledRes.data ?? []) as unknown as UnbilledRow[]) {
    const project = row.task?.project
    if (!project) continue
    const fixedRate = project.fixed_rate != null ? Number(project.fixed_rate) : null
    // Fixed-price projects bill once, so their time groups together under the project.
    const key = fixedRate != null ? `fixed:${project.id}` : `${project.id}:${row.task!.title}`
    const existing = groups.get(key)
    const minutes = row.duration_minutes ?? 0
    if (existing) {
      existing.minutes += minutes
      existing.entryIds.push(row.id)
    } else {
      groups.set(key, {
        key,
        taskTitle: fixedRate != null ? project.name : row.task!.title,
        projectName: project.name,
        projectId: project.id,
        clientId: project.client_id,
        minutes,
        rate: fixedRate != null ? null : project.hourly_rate != null ? Number(project.hourly_rate) : null,
        fixedRate,
        entryIds: [row.id],
      })
    }
  }

  const taxes = coerceTaxes(profileRes.data?.taxes)

  return (
    <>
      <PageHeader title="New invoice" description="Check the unbilled time, add any fixed fees, and save." />
      <InvoiceBuilder
        action={createInvoice}
        clients={clients}
        projects={projects}
        unbilled={[...groups.values()]}
        taxes={taxes}
        initialClientId={preselect ?? undefined}
        initialProjectId={typeof project_id === 'string' ? project_id : undefined}
      />
    </>
  )
}
