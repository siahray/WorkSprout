'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isUuid, money, optionalText, text, type FormState } from '@/lib/validation'

const PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'archived']
const TASK_STATUSES = ['todo', 'in_progress', 'done']

function readProject(formData: FormData) {
  const billingType = text(formData, 'billing_type')
  const rate = money(formData, 'rate')
  const status = text(formData, 'status')

  return {
    name: text(formData, 'name'),
    client_id: text(formData, 'client_id'),
    description: optionalText(formData, 'description'),
    status: PROJECT_STATUSES.includes(status) ? status : 'active',
    billingType,
    rate,
  }
}

function rateColumns(billingType: string, rate: number | null) {
  if (billingType === 'hourly') return { hourly_rate: rate, fixed_rate: null }
  if (billingType === 'fixed') return { fixed_rate: rate, hourly_rate: null }
  return { hourly_rate: null, fixed_rate: null }
}

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readProject(formData)

  if (!values.name) return { error: 'Project name is required.' }
  if (!isUuid(values.client_id)) return { error: 'Choose a client for this project.' }
  if (values.billingType !== 'none' && (values.rate === null || values.rate <= 0)) {
    return { error: 'Enter a rate, or set billing to “No rate”.' }
  }

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
      ...rateColumns(values.billingType, values.rate),
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
  if (values.billingType !== 'none' && (values.rate === null || values.rate <= 0)) {
    return { error: 'Enter a rate, or set billing to “No rate”.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({
      name: values.name,
      description: values.description,
      status: values.status,
      ...rateColumns(values.billingType, values.rate),
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
