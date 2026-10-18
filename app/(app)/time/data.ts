import { createClient } from '@/lib/supabase/server'
import type { ProjectOption } from './timer-controls'

type Supabase = Awaited<ReturnType<typeof createClient>>

export async function loadProjectOptions(supabase: Supabase): Promise<ProjectOption[]> {
  const [projectsRes, tasksRes, phasesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, client:clients(name)')
      .neq('status', 'archived')
      .order('name', { ascending: true }),
    supabase
      .from('tasks')
      .select('id, title, project_id, phase_id, position, created_at')
      .order('created_at', { ascending: true }),
    supabase.from('phases').select('id, project_id, position'),
  ])

  const projects = (projectsRes.data ?? []) as unknown as {
    id: string
    name: string
    client: { name: string } | null
  }[]
  const tasks = (tasksRes.data ?? []) as {
    id: string
    title: string
    project_id: string
    phase_id: string | null
    position: number
    created_at: string
  }[]
  const phases = (phasesRes.data ?? []) as { id: string; project_id: string; position: number }[]
  const phasePosition = new Map(phases.map((ph) => [ph.id, ph.position]))

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    clientName: p.client?.name ?? null,
    tasks: tasks
      .filter((t) => t.project_id === p.id)
      // Mirror the project page: tasks in phase order (unassigned last), each
      // group in its own position order.
      .sort((a, b) => {
        const pa = a.phase_id ? (phasePosition.get(a.phase_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
        const pb = b.phase_id ? (phasePosition.get(b.phase_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER
        return pa - pb || a.position - b.position
      })
      .map((t) => ({ id: t.id, title: t.title })),
  }))
}
