import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { ProjectForm } from '../../project-form'
import { updateProject } from '../../actions'

export const metadata: Metadata = {
  title: 'Edit project · WorkSprout',
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, client_id, name, description, status, hourly_rate, fixed_rate')
    .eq('id', id)
    .maybeSingle()

  if (!project) notFound()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name', { ascending: true })

  return (
    <>
      <PageHeader title="Edit project" description="Update details, status, and billing." />
      <ProjectForm
        action={updateProject}
        clients={clients ?? []}
        defaults={project}
        submitLabel="Save changes"
        cancelHref={`/projects/${id}`}
      />
    </>
  )
}
