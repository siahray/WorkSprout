'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { attachmentPathsForParent, removeAttachmentObjects } from '@/lib/attachments-server'
import { isUuid, money, optionalText, text, type FormState } from '@/lib/validation'

const PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'archived']
const TASK_STATUSES = ['todo', 'in_progress', 'done']

function readProject(formData: FormData) {
  const hourlyRaw = text(formData, 'hourly_rate')
  const fixedRaw = text(formData, 'fixed_rate')
  const status = text(formData, 'status')

  return {
    name: text(formData, 'name'),
    client_id: text(formData, 'client_id'),
    description: optionalText(formData, 'description'),
    status: PROJECT_STATUSES.includes(status) ? status : 'active',
    hourlyRate: hourlyRaw ? money(formData, 'hourly_rate') : null,
    fixedRate: fixedRaw ? money(formData, 'fixed_rate') : null,
    hourlyRaw,
    fixedRaw,
  }
}

function validateRates(values: ReturnType<typeof readProject>): string | null {
  if (values.hourlyRaw && values.hourlyRate === null) return 'Enter a valid hourly rate, or leave it blank.'
  if (values.fixedRaw && values.fixedRate === null) return 'Enter a valid fixed amount, or leave it blank.'
  return null
}

// Both rates are kept side by side: the hourly rate is never wiped when a fixed
// amount is set, so a project can track hourly value and bill a fixed price.
function rateColumns(values: ReturnType<typeof readProject>) {
  return { hourly_rate: values.hourlyRate, fixed_rate: values.fixedRate }
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readProject(formData)

  if (!values.name) return { error: 'Project name is required.' }
  if (!isUuid(values.client_id)) return { error: 'Choose a client for this project.' }
  const rateError = validateRates(values)
  if (rateError) return { error: rateError }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  // The pickers hide archived clients; re-check here so a stale form or a
  // hand-built request can't start new work under one. The read is RLS-scoped,
  // so a client that isn't the caller's reads as "not found" rather than
  // leaking — and no longer attaches to someone else's client either.
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id, archived_at')
    .eq('id', values.client_id)
    .maybeSingle()
  if (!clientRow) return { error: 'Choose a client for this project.' }
  if (clientRow.archived_at) return { error: 'That client is archived — restore them first.' }

  const { data: inserted, error } = await supabase
    .from('projects')
    .insert({
      user_id: data.claims.sub,
      client_id: values.client_id,
      name: values.name,
      description: values.description,
      status: values.status,
      ...rateColumns(values),
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('create project failed:', error?.message)
    return { error: 'Could not save the project — please try again.' }
  }

  revalidatePath('/projects')
  revalidatePath('/clients')
  redirect(`/projects/${inserted.id}`)
}

export async function updateProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const values = readProject(formData)

  if (!isUuid(id)) return { error: 'That project could not be found.' }
  if (!values.name) return { error: 'Project name is required.' }
  const rateError = validateRates(values)
  if (rateError) return { error: rateError }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({
      name: values.name,
      description: values.description,
      status: values.status,
      ...rateColumns(values),
    })
    .eq('id', id)

  if (error) {
    console.error('update project failed:', error.message)
    return { error: 'Could not save the project — please try again.' }
  }

  revalidatePath('/projects')
  revalidatePath(`/projects/${id}`)
  redirect(`/projects/${id}`)
}

export async function deleteProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That project could not be found.' }

  const supabase = await createClient()

  // Remove Storage objects before the cascading delete drops their metadata rows.
  await removeAttachmentObjects(supabase, await attachmentPathsForParent(supabase, { project_id: id }))

  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    console.error('delete project failed:', error.message)
    return { error: 'Could not delete the project — please try again.' }
  }

  revalidatePath('/projects')
  revalidatePath('/clients')
  redirect('/projects')
}

export async function addPhase(_prev: FormState, formData: FormData): Promise<FormState> {
  const projectId = text(formData, 'project_id')
  const title = text(formData, 'title')

  if (!isUuid(projectId)) return { error: 'That project could not be found.' }
  if (!title) return { error: 'Enter a phase name.' }
  if (title.length > 200) return { error: 'Keep the phase name under 200 characters.' }

  const supabase = await createClient()

  const { data: last } = await supabase
    .from('phases')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('phases').insert({
    project_id: projectId,
    title,
    position: (last?.position ?? -1) + 1,
  })

  if (error) {
    console.error('add phase failed:', error.message)
    return { error: 'Could not add the phase. Please try again.' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/focus')
  return { ok: 'Phase added.' }
}

export async function deletePhase(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const projectId = optionalText(formData, 'project_id')

  if (!isUuid(id)) return { error: 'That phase could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('phases').delete().eq('id', id)

  if (error) {
    console.error('delete phase failed:', error.message)
    return { error: 'Could not delete the phase. Please try again.' }
  }

  if (projectId && isUuid(projectId)) revalidatePath(`/projects/${projectId}`)
  revalidatePath('/focus')
  return { ok: 'Phase removed.' }
}

export async function addTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const projectId = text(formData, 'project_id')
  const title = text(formData, 'title')
  const phaseId = optionalText(formData, 'phase_id')

  if (!isUuid(projectId)) return { error: 'That project could not be found.' }
  if (!title) return { error: 'Enter a task title.' }
  if (phaseId && !isUuid(phaseId)) return { error: 'That phase could not be found.' }

  const supabase = await createClient()

  // Tasks order within their (project, phase) group, so the next position is the
  // highest already in that group plus one. A null phase is its own group.
  let lastQuery = supabase.from('tasks').select('position').eq('project_id', projectId)
  lastQuery = phaseId ? lastQuery.eq('phase_id', phaseId) : lastQuery.is('phase_id', null)
  const { data: last } = await lastQuery
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('tasks').insert({
    project_id: projectId,
    phase_id: phaseId ?? null,
    title,
    position: (last?.position ?? -1) + 1,
  })

  if (error) {
    console.error('add task failed:', error.message)
    return { error: 'Could not add the task — please try again.' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/time')
  revalidatePath('/focus')
  return { ok: 'Task added.' }
}

export async function setTaskStatus(id: string, status: string): Promise<void> {
  if (!isUuid(id) || !TASK_STATUSES.includes(status)) return

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (error) console.error('set task status failed:', error.message)

  revalidatePath('/projects')
  revalidatePath('/time')
  revalidatePath('/focus')
}

export async function deleteTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That task could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id)

  if (error) {
    console.error('delete task failed:', error.message)
    return { error: 'Could not delete the task — please try again.' }
  }

  revalidatePath('/projects')
  revalidatePath('/time')
  revalidatePath('/focus')
  return { ok: 'Task deleted.' }
}

export async function addSubtask(_prev: FormState, formData: FormData): Promise<FormState> {
  const parentTaskId = text(formData, 'parent_task_id')
  const projectId = text(formData, 'project_id')
  const title = text(formData, 'title')

  if (!isUuid(parentTaskId) || !isUuid(projectId)) return { error: 'Invalid request.' }
  if (!title) return { error: 'Enter a subtask title.' }

  const supabase = await createClient()

  // Subtasks order within their parent task, so the next position is the highest
  // already under that parent plus one.
  const { data: last } = await supabase
    .from('subtasks')
    .select('position')
    .eq('parent_task_id', parentTaskId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('subtasks').insert({
    parent_task_id: parentTaskId,
    project_id: projectId,
    title,
    position: (last?.position ?? -1) + 1,
  })

  if (error) {
    console.error('add subtask failed:', error.message)
    return { error: 'Could not add the subtask - please try again.' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/focus')
  return { ok: 'Subtask added.' }
}

export async function setSubtaskStatus(id: string, status: string): Promise<void> {
  if (!isUuid(id) || !TASK_STATUSES.includes(status)) return

  const supabase = await createClient()
  const { data } = await supabase.from('subtasks').select('project_id').eq('id', id).maybeSingle()
  const { error } = await supabase.from('subtasks').update({ status }).eq('id', id)
  if (error) console.error('set subtask status failed:', error.message)

  if (data?.project_id) {
    revalidatePath(`/projects/${data.project_id}`)
  }
  revalidatePath('/projects')
  revalidatePath('/focus')
}

export async function deleteSubtask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const projectId = optionalText(formData, 'project_id')

  if (!isUuid(id)) return { error: 'That subtask could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('subtasks').delete().eq('id', id)

  if (error) {
    console.error('delete subtask failed:', error.message)
    return { error: 'Could not delete the subtask - please try again.' }
  }

  if (projectId && isUuid(projectId)) {
    revalidatePath(`/projects/${projectId}`)
  }
  revalidatePath('/projects')
  revalidatePath('/focus')
  return { ok: 'Subtask deleted.' }
}

// Pure: reorder a list of ids by moving `id` one step up or down. Returns the
// same array untouched when the move is a no-op (already at the edge), so the
// caller can bail without writing anything.
function stepOrder(ids: string[], id: string, direction: 'up' | 'down'): string[] {
  const index = ids.indexOf(id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || target < 0 || target >= ids.length) return ids
  const next = [...ids]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

// Rewrites `position` to match the new ordering, but only for rows whose value
// actually moved — so a single-step reorder stays a pair of writes. Returns an
// error message on failure (null on success) so callers report a failed reorder
// honestly instead of claiming success.
async function writeOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'phases' | 'tasks' | 'subtasks',
  rows: { id: string; position: number }[],
  order: string[],
): Promise<string | null> {
  const byId = new Map(rows.map((row) => [row.id, row.position]))
  for (const [index, id] of order.entries()) {
    if (byId.get(id) === index) continue
    const { error } = await supabase.from(table).update({ position: index }).eq('id', id)
    if (error) {
      console.error(`reorder ${table} failed:`, error.message)
      return 'Could not reorder — please try again.'
    }
  }
  return null
}

export async function updatePhase(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const title = text(formData, 'title')

  if (!isUuid(id)) return { error: 'That phase could not be found.' }
  if (!title) return { error: 'Enter a phase name.' }
  if (title.length > 200) return { error: 'Keep the phase name under 200 characters.' }

  const supabase = await createClient()
  // One statement: the .select() both proves the row landed and yields the
  // project to revalidate.
  const { data, error } = await supabase
    .from('phases')
    .update({ title })
    .eq('id', id)
    .select('project_id')
    .maybeSingle()

  if (error) {
    console.error('update phase failed:', error.message)
    return { error: 'Could not rename the phase. Please try again.' }
  }
  if (!data) return { error: 'That phase could not be found.' }

  revalidatePath(`/projects/${data.project_id}`)
  revalidatePath('/focus')
  return { ok: 'Phase renamed.' }
}

export async function movePhase(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const direction = text(formData, 'direction')

  if (!isUuid(id) || (direction !== 'up' && direction !== 'down')) {
    return { error: 'Invalid request.' }
  }

  const supabase = await createClient()
  const { data: phase } = await supabase
    .from('phases')
    .select('id, project_id')
    .eq('id', id)
    .maybeSingle()
  if (!phase) return { error: 'That phase could not be found.' }

  // Siblings share a project. The order mirrors the page: position, then
  // created_at and id as stable tiebreakers.
  const { data: siblings } = await supabase
    .from('phases')
    .select('id, position, created_at')
    .eq('project_id', phase.project_id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  const rows = siblings ?? []
  const ids = rows.map((row) => row.id)
  const next = stepOrder(ids, id, direction)
  if (next === ids) return { ok: 'Already at the edge.' }

  const writeError = await writeOrder(supabase, 'phases', rows, next)
  if (writeError) return { error: writeError }

  revalidatePath(`/projects/${phase.project_id}`)
  revalidatePath('/focus')
  return { ok: 'Phase reordered.' }
}

export async function updateTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const title = text(formData, 'title')

  if (!isUuid(id)) return { error: 'That task could not be found.' }
  if (!title) return { error: 'Enter a task title.' }
  if (title.length > 200) return { error: 'Keep the task title under 200 characters.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .update({ title })
    .eq('id', id)
    .select('project_id')
    .maybeSingle()

  if (error) {
    console.error('update task failed:', error.message)
    return { error: 'Could not rename the task. Please try again.' }
  }
  if (!data) return { error: 'That task could not be found.' }

  revalidatePath(`/projects/${data.project_id}`)
  revalidatePath('/time')
  revalidatePath('/focus')
  return { ok: 'Task renamed.' }
}

export async function moveTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const direction = text(formData, 'direction')

  if (!isUuid(id) || (direction !== 'up' && direction !== 'down')) {
    return { error: 'Invalid request.' }
  }

  const supabase = await createClient()
  const { data: task } = await supabase
    .from('tasks')
    .select('id, project_id, phase_id')
    .eq('id', id)
    .maybeSingle()
  if (!task) return { error: 'That task could not be found.' }

  // Tasks order within their (project, phase) pair — a null phase is the
  // project's "unassigned" bucket and orders on its own.
  let query = supabase
    .from('tasks')
    .select('id, position, created_at')
    .eq('project_id', task.project_id)
  query = task.phase_id ? query.eq('phase_id', task.phase_id) : query.is('phase_id', null)
  const { data: siblings } = await query
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  const rows = siblings ?? []
  const ids = rows.map((row) => row.id)
  const next = stepOrder(ids, id, direction)
  if (next === ids) return { ok: 'Already at the edge.' }

  const writeError = await writeOrder(supabase, 'tasks', rows, next)
  if (writeError) return { error: writeError }

  revalidatePath(`/projects/${task.project_id}`)
  revalidatePath('/time')
  revalidatePath('/focus')
  return { ok: 'Task reordered.' }
}

export async function updateSubtask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const title = text(formData, 'title')

  if (!isUuid(id)) return { error: 'That subtask could not be found.' }
  if (!title) return { error: 'Enter a subtask title.' }
  if (title.length > 200) return { error: 'Keep the subtask title under 200 characters.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('subtasks')
    .update({ title })
    .eq('id', id)
    .select('project_id')
    .maybeSingle()

  if (error) {
    console.error('update subtask failed:', error.message)
    return { error: 'Could not rename the subtask. Please try again.' }
  }
  if (!data) return { error: 'That subtask could not be found.' }

  revalidatePath(`/projects/${data.project_id}`)
  revalidatePath('/focus')
  return { ok: 'Subtask renamed.' }
}

export async function moveSubtask(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const direction = text(formData, 'direction')

  if (!isUuid(id) || (direction !== 'up' && direction !== 'down')) {
    return { error: 'Invalid request.' }
  }

  const supabase = await createClient()
  const { data: subtask } = await supabase
    .from('subtasks')
    .select('id, project_id, parent_task_id')
    .eq('id', id)
    .maybeSingle()
  if (!subtask) return { error: 'That subtask could not be found.' }

  // Subtasks order within their parent task.
  const { data: siblings } = await supabase
    .from('subtasks')
    .select('id, position, created_at')
    .eq('parent_task_id', subtask.parent_task_id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })

  const rows = siblings ?? []
  const ids = rows.map((row) => row.id)
  const next = stepOrder(ids, id, direction)
  if (next === ids) return { ok: 'Already at the edge.' }

  const writeError = await writeOrder(supabase, 'subtasks', rows, next)
  if (writeError) return { error: writeError }

  revalidatePath(`/projects/${subtask.project_id}`)
  revalidatePath('/focus')
  return { ok: 'Subtask reordered.' }
}
