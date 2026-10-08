'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
  const { error } = await supabase.from('projects').delete().eq('id', id)

  if (error) {
    console.error('delete project failed:', error.message)
    return { error: 'Could not delete the project — please try again.' }
  }

  revalidatePath('/projects')
  revalidatePath('/clients')
  redirect('/projects')
}

export async function addTask(_prev: FormState, formData: FormData): Promise<FormState> {
  const projectId = text(formData, 'project_id')
  const title = text(formData, 'title')

  if (!isUuid(projectId)) return { error: 'That project could not be found.' }
  if (!title) return { error: 'Enter a task title.' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').insert({ project_id: projectId, title })

  if (error) {
    console.error('add task failed:', error.message)
    return { error: 'Could not add the task — please try again.' }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/time')
  return { ok: 'Task added.' }
}

export async function setTaskStatus(id: string, status: string): Promise<void> {
  if (!isUuid(id) || !TASK_STATUSES.includes(status)) return

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (error) console.error('set task status failed:', error.message)

  revalidatePath('/projects')
  revalidatePath('/time')
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
  return { ok: 'Task deleted.' }
}
