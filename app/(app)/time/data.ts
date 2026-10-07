import { createClient } from '@/lib/supabase/server'
import type { ProjectOption } from './timer-controls'

type Supabase = Awaited<ReturnType<typeof createClient>>

export async function loadProjectOptions(supabase: Supabase): Promise<ProjectOption[]> {
  const [projectsRes, tasksRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, client:clients(name)')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
    supabase.from('tasks').select('id, title, project_id').order('created_at', { ascending: true }),
  ])

  const projects = (projectsRes.data ?? []) as unknown as {
    id: string
    name: string
    client: { name: string } | null
  }[]
  const tasks = (tasksRes.data ?? []) as { id: string; title: string; project_id: string }[]

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.client?.name ?? null,
    tasks: tasks.filter((t) => t.project_id === p.id).map((t) => ({ id: t.id, title: t.title })),
  }))
}
