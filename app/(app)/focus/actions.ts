'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { nowDateInput } from '@/lib/format'
import { isUuid, optionalText, text, type FormState } from '@/lib/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function createTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = text(formData, 'title')
  const projectId = optionalText(formData, 'project_id')
  const dueDate = text(formData, 'due_date') || nowDateInput()

  if (!title) return { error: 'To-do title is required.' }
  if (title.length > 200) return { error: 'Keep the title under 200 characters.' }
  if (!DATE_RE.test(dueDate)) return { error: 'Pick a valid date for this to-do.' }
  if (projectId && !isUuid(projectId)) return { error: 'That project could not be found.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  if (projectId) {
    const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).maybeSingle()
    if (!project) return { error: 'That project could not be found.' }
  }

  const { error } = await supabase.from('todos').insert({
    user_id: data.claims.sub,
    project_id: projectId ?? null,
    title,
    due_date: dueDate,
  })
  if (error) {
    console.error('create todo failed:', error.message)
    return { error: 'Could not save the to-do — please try again.' }
  }

  revalidatePath('/focus')
  return { ok: 'Added to your list.' }
}

export async function toggleTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That to-do could not be found.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { data: current } = await supabase
    .from('todos')
    .select('completed_at')
    .eq('id', id)
    .eq('user_id', data.claims.sub)
    .maybeSingle()
  if (!current) return { error: 'That to-do could not be found.' }

  const { error } = await supabase
    .from('todos')
    .update({ completed_at: current.completed_at ? null : new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', data.claims.sub)
  if (error) {
    console.error('toggle todo failed:', error.message)
    return { error: 'Could not update the to-do — please try again.' }
  }

  revalidatePath('/focus')
  return {}
}

export async function addToToday(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = text(formData, 'title')
  const projectId = optionalText(formData, 'project_id')
  const dueDate = text(formData, 'due_date') || nowDateInput()

  if (!title) return { error: 'Nothing to add.' }
  if (title.length > 200) return { error: 'Keep the title under 200 characters.' }
  if (!DATE_RE.test(dueDate)) return { error: 'Pick a valid date for this to-do.' }
  if (projectId && !isUuid(projectId)) return { error: 'That project could not be found.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { error } = await supabase.from('todos').insert({
    user_id: data.claims.sub,
    project_id: projectId ?? null,
    title,
    due_date: dueDate,
  })
  if (error) {
    console.error('add deliverable to today failed:', error.message)
    return { error: 'Could not add the to-do — please try again.' }
  }

  revalidatePath('/focus')
  return { ok: 'Added to today.' }
}

export async function deleteTodo(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That to-do could not be found.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', data.claims.sub)
  if (error) {
    console.error('delete todo failed:', error.message)
    return { error: 'Could not delete the to-do — please try again.' }
  }

  revalidatePath('/focus')
  return { ok: 'To-do removed.' }
}