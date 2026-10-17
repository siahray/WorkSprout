'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { nowDateInput } from '@/lib/format'
import { callIcs, fetchCallSnapshot, isCallStatus, manilaToIso } from '@/lib/call'
import { scheduleCall } from '@/lib/api-mutations'
import { renderCallEmail } from '@/lib/call-email'
import { emailConfigured, sendEmail } from '@/lib/email'
import { siteUrl } from '@/lib/site'
import { isEmail, isUuid, optionalText, text, type FormState } from '@/lib/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

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

// --- Calls -------------------------------------------------------------------

export async function createCall(_prev: FormState, formData: FormData): Promise<FormState> {
  const date = text(formData, 'call_date')
  const time = text(formData, 'call_time')

  if (!TIME_RE.test(time)) return { error: 'Pick a start time.' }

  const scheduledAt = manilaToIso(date, time)
  if (!scheduledAt) return { error: 'Pick a valid date and time.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  // Shared with the integration API, so the form and the API cannot drift.
  const result = await scheduleCall(supabase, userId, {
    title: text(formData, 'title'),
    client_id: optionalText(formData, 'client_id'),
    scheduled_at: scheduledAt,
    duration_minutes: text(formData, 'duration_minutes'),
    location: optionalText(formData, 'location'),
    notes: optionalText(formData, 'notes'),
  })
  if (!result.ok) return { error: result.error }

  revalidatePath('/focus')
  return { ok: 'Call scheduled.' }
}

export async function deleteCall(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That call could not be found.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { error } = await supabase.from('calls').delete().eq('id', id).eq('user_id', data.claims.sub)
  if (error) {
    console.error('delete call failed:', error.message)
    return { error: 'Could not delete the call — please try again.' }
  }

  revalidatePath('/focus')
  return { ok: 'Call removed.' }
}

export async function setCallStatus(id: string, status: string): Promise<void> {
  if (!isUuid(id) || !isCallStatus(status)) return

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return

  const { error } = await supabase
    .from('calls')
    .update({ status })
    .eq('id', id)
    .eq('user_id', data.claims.sub)
  if (error) console.error('set call status failed:', error.message)

  revalidatePath('/focus')
}

export async function sendCallInvite(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That call could not be found.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  if (!emailConfigured()) {
    return { error: 'Email is not set up yet — add RESEND_API_KEY and EMAIL_FROM to enable sending.' }
  }

  const call = await fetchCallSnapshot(supabase, id, userId)
  if (!call) return { error: 'That call could not be found.' }

  const to = call.client?.email?.trim()
  if (!to || !isEmail(to)) {
    return { error: 'Add a valid email address to this client before sending.' }
  }

  const base = await siteUrl()
  const link = base ? `${base}/c/${call.publicToken}` : null

  const { subject, html, text: body } = renderCallEmail(call, link, true)
  const ics = await callIcs(call, link)
  const result = await sendEmail({
    to,
    subject,
    html,
    text: body,
    replyTo: call.business.email ?? undefined,
    attachments: [{ filename: 'call.ics', content: Buffer.from(ics, 'utf8').toString('base64') }],
  })
  if (!result.ok) return { error: result.error }

  const { error: updateError } = await supabase
    .from('calls')
    .update({ invited_at: new Date().toISOString(), invited_to: to })
    .eq('id', id)
  if (updateError) console.error('record call invite failed:', updateError.message)

  revalidatePath('/focus')
  return { ok: `Invite emailed to ${to}.` }
}