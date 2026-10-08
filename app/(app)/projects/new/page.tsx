import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { ProjectForm } from '../project-form'
import { createProject } from '../actions'

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

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

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
        defaults={{ client_id: typeof client_id === 'string' ? client_id : undefined }}
        submitLabel="Create project"
        cancelHref="/projects"
      />
    </>
  )
}
