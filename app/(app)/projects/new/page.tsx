import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { ProjectForm } from '../project-form'
import { createProject } from '../actions'
import { isUuid } from '@/lib/validation'

export const metadata: Metadata = {
  title: 'New project · WorkSprout',
}

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')

  // Deep links preselect a client. Keep that one even if it has since been
  // archived, so the form shows who it is — createProject refuses archived
  // clients with a clear message rather than silently falling back to another.
  const preselect = typeof client_id === 'string' && isUuid(client_id) ? client_id : null
  const clientQuery = supabase.from('clients').select('id, name').order('name', { ascending: true })
  const { data: clients } = preselect
    ? await clientQuery.or(`archived_at.is.null,id.eq.${preselect}`)
    : await clientQuery.is('archived_at', null)

  if (!clients || clients.length === 0) {
    return (
      <>
        <PageHeader title="New project" description="Projects group tasks, time, and invoices under a client." />
        <EmptyState
          title="Add a client first"
          description="Every project belongs to a client. Create one, then come back to add the project."
          actionHref="/clients/new"
          actionLabel="Add a client"
        />
      </>
    )
  }

  return (
    <>
      <PageHeader title="New project" description="Projects group tasks, time, and invoices under a client." />
      <ProjectForm
        action={createProject}
        clients={clients}
        defaults={{ client_id: preselect ?? undefined }}
        submitLabel="Create project"
        cancelHref="/projects"
      />
    </>
  )
}
