'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid, optionalText, text, type FormState } from '@/lib/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

function timerError(message: string): string {
  if (/invalid time range/i.test(message)) return 'The end time must be after the start time.'
  if (/task not found/i.test(message)) return 'That task could not be found.'
  if (/not authenticated/i.test(message)) return 'Your session expired — sign in again.'
  return 'Something went wrong — please try again.'
}

export async function startTimer(taskId: string): Promise<{ error?: string }> {
  if (!isUuid(taskId)) return { error: 'Pick a task to start a timer.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { error } = await supabase.rpc('start_timer', { p_task_id: taskId })
  if (error) {
    console.error('start_timer failed:', error.message)
    return { error: timerError(error.message) }
  }

  revalidatePath('/', 'layout')
  return {}
}

export async function pauseTimer(entryId: string): Promise<{ error?: string }> {
  if (!isUuid(entryId)) return { error: 'That timer could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('pause_timer', { p_id: entryId })
  if (error) {
    console.error('pause_timer failed:', error.message)
    return { error: 'Could not pause the timer — refresh and try again.' }
  }

  revalidatePath('/', 'layout')
  return {}
}

export async function resumeTimer(entryId: string): Promise<{ error?: string }> {
  if (!isUuid(entryId)) return { error: 'That timer could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('resume_timer', { p_id: entryId })
  if (error) {
    console.error('resume_timer failed:', error.message)
    return { error: 'Could not resume the timer — refresh and try again.' }
  }

  revalidatePath('/', 'layout')
  return {}
}

export async function stopTimer(entryId: string): Promise<void> {
  if (!isUuid(entryId)) return

  const supabase = await createClient()
  const { error } = await supabase.rpc('stop_timer', { p_id: entryId })
  if (error) console.error('stop_timer failed:', error.message)

  revalidatePath('/', 'layout')
}

export async function addManualEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const taskId = text(formData, 'task_id')
  const date = text(formData, 'date')
  const start = text(formData, 'start')
  const end = text(formData, 'end')
  const note = optionalText(formData, 'note')
  const billable = formData.get('billable') != null

  if (!isUuid(taskId)) return { error: 'Choose a task.' }
  if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) {
    return { error: 'Enter a valid date, start time, and end time.' }
  }
  if (end <= start) return { error: 'The end time must be after the start time.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { error } = await supabase.rpc('add_manual_entry', {
    p_task_id: taskId,
    p_start: `${date}T${start}:00`,
    p_end: `${date}T${end}:00`,
    p_note: note,
    p_billable: billable,
  })

  if (error) {
    console.error('add_manual_entry failed:', error.message)
    return { error: timerError(error.message) }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/time')
  return { ok: 'Time logged.' }
}

export async function updateManualEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const date = text(formData, 'date')
  const start = text(formData, 'start')
  const end = text(formData, 'end')
  const note = optionalText(formData, 'note')
  const billable = formData.get('billable') != null

  if (!isUuid(id)) return { error: 'That time entry could not be found.' }
  if (!DATE_RE.test(date) || !TIME_RE.test(start) || !TIME_RE.test(end)) {
    return { error: 'Enter a valid date, start time, and end time.' }
  }
  if (end <= start) return { error: 'The end time must be after the start time.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('update_manual_entry', {
    p_id: id,
    p_start: `${date}T${start}:00`,
    p_end: `${date}T${end}:00`,
    p_note: note,
    p_billable: billable,
  })

  if (error) {
    console.error('update_manual_entry failed:', error.message)
    return { error: timerError(error.message) }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/time')
  return { ok: 'Time entry updated.' }
}

export async function deleteTimeEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That time entry could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('time_entries')
    .delete()
    .eq('id', id)
    .is('invoice_id', null)

  if (error) {
    console.error('delete time entry failed:', error.message)
    return { error: 'Could not delete the time entry — it may already be invoiced.' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/time')
  return { ok: 'Time entry deleted.' }
}
