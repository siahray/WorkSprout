'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isUuid, text, type FormState } from '@/lib/validation'
import { recordAdminAction } from './audit'

const FEEDBACK_STATUSES = ['new', 'read', 'resolved'] as const
const AUDIENCES = ['signups', 'invited', 'users'] as const

// Resolve the caller's admin session, or null when they are not an admin.
async function adminSession() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (claims?.app_metadata?.role !== 'admin') return null
  return { supabase, claims }
}

// Turn cryptic Postgres error text into something an admin can act on.
function friendly(message: string): string {
  if (/not authorized/i.test(message)) return 'You are not authorized to do that.'
  if (/own admin access/i.test(message)) return 'You cannot remove your own admin access.'
  if (/own account/i.test(message)) return 'You cannot suspend your own account.'
  if (/at least one admin/i.test(message)) return 'At least one admin must remain.'
  if (/user not found/i.test(message)) return 'That user could not be found.'
  return 'Something went wrong — please try again.'
}

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = []
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size))
  return groups
}

// ---------------------------------------------------------------------------
// Beta signups
// ---------------------------------------------------------------------------

export async function deleteSignup(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That signup could not be found.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }

  const { error } = await session.supabase.from('beta_signups').delete().eq('id', id)
  if (error) {
    console.error('delete signup failed:', error.message)
    return { error: 'Could not delete the signup — please try again.' }
  }

  await recordAdminAction(
    session.supabase,
    { id: session.claims.sub, email: session.claims.email },
    'signup.delete',
    id
  )
  revalidatePath('/admin')
  return { ok: 'Signup deleted.' }
}

export async function bulkDeleteSignups(_prev: FormState, formData: FormData): Promise<FormState> {
  const ids = [...new Set(formData.getAll('ids').map(String).filter(isUuid))]
  if (ids.length === 0) return { error: 'Select at least one signup to delete.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }

  const { error } = await session.supabase.from('beta_signups').delete().in('id', ids)
  if (error) {
    console.error('bulk delete signups failed:', error.message)
    return { error: 'Could not delete the selected signups — please try again.' }
  }

  await recordAdminAction(
    session.supabase,
    { id: session.claims.sub, email: session.claims.email },
    'signup.bulk_delete',
    null,
    { count: ids.length }
  )
  revalidatePath('/admin')
  return { ok: `Deleted ${ids.length} signup${ids.length === 1 ? '' : 's'}.` }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function setUserRole(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const makeAdmin = text(formData, 'is_admin') === '1'
  if (!isUuid(id)) return { error: 'That user could not be found.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }
  if (id === session.claims.sub) return { error: 'You cannot change your own admin role.' }

  const { error } = await session.supabase.rpc('admin_set_admin_role', {
    p_user: id,
    p_is_admin: makeAdmin,
  })
  if (error) {
    console.error('set admin role failed:', error.message)
    return { error: friendly(error.message) }
  }

  await recordAdminAction(
    session.supabase,
    { id: session.claims.sub, email: session.claims.email },
    makeAdmin ? 'user.grant_admin' : 'user.revoke_admin',
    id
  )
  revalidatePath('/admin/users')
  return { ok: makeAdmin ? 'Admin access granted.' : 'Admin access removed.' }
}

export async function setUserBanned(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const ban = text(formData, 'banned') === '1'
  if (!isUuid(id)) return { error: 'That user could not be found.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }
  if (id === session.claims.sub) return { error: 'You cannot suspend your own account.' }

  const { error } = await session.supabase.rpc('admin_set_user_banned', {
    p_user: id,
    p_banned: ban,
  })
  if (error) {
    console.error('set user banned failed:', error.message)
    return { error: friendly(error.message) }
  }

  await recordAdminAction(
    session.supabase,
    { id: session.claims.sub, email: session.claims.email },
    ban ? 'user.suspend' : 'user.restore',
    id
  )
  revalidatePath('/admin/users')
  return { ok: ban ? 'Account suspended.' : 'Account restored.' }
}

// ---------------------------------------------------------------------------
// Broadcast
// ---------------------------------------------------------------------------

export async function sendBroadcast(_prev: FormState, formData: FormData): Promise<FormState> {
  const subject = text(formData, 'subject')
  const body = text(formData, 'body')
  const audience = text(formData, 'audience') || 'signups'

  if (!subject) return { error: 'Add a subject.' }
  if (subject.length > 200) return { error: 'Keep the subject under 200 characters.' }
  if (!body) return { error: 'Write a message.' }
  if (body.length > 20000) return { error: 'That message is too long.' }
  if (!(AUDIENCES as readonly string[]).includes(audience)) return { error: 'Pick an audience.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }

  // Resolve the audience to a de-duplicated list of email addresses.
  let recipients: string[] = []
  if (audience === 'users') {
    const { data } = await session.supabase.from('profiles').select('email').not('email', 'is', null)
    recipients = (data ?? []).map((row) => row.email).filter((e): e is string => Boolean(e))
  } else {
    let query = session.supabase.from('beta_signups').select('email')
    if (audience === 'invited') query = query.not('invited_at', 'is', null)
    const { data } = await query
    recipients = (data ?? []).map((row) => row.email).filter((e): e is string => Boolean(e))
  }
  recipients = [...new Set(recipients.map((e) => e.toLowerCase()))]

  if (recipients.length === 0) return { error: 'No recipients matched that audience.' }

  const actor = { id: session.claims.sub, email: session.claims.email }
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? process.env.RESEND_FROM

  if (!apiKey || !from) {
    await session.supabase.from('admin_broadcasts').insert({
      actor_id: actor.id,
      subject,
      body,
      audience,
      recipient_count: 0,
      provider: null,
      status: 'not_configured',
      error: 'Missing RESEND_API_KEY or EMAIL_FROM.',
    })
    await recordAdminAction(session.supabase, actor, 'broadcast.send', audience, {
      subject,
      recipients: recipients.length,
      status: 'not_configured',
    })
    revalidatePath('/admin/broadcast')
    return {
      error:
        'Email is not configured. Set RESEND_API_KEY and EMAIL_FROM in the environment, then try again.',
    }
  }

  // Resend accepts up to 100 messages per batch call.
  let sent = 0
  let failure: string | null = null
  for (const group of chunk(recipients, 100)) {
    try {
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          group.map((to) => ({ from, to, subject, text: body }))
        ),
      })

      if (!response.ok) {
        const detail = await response.text().catch(() => '')
        failure = `Resend responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`
        break
      }
      sent += group.length
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Network error'
      break
    }
  }

  const status = failure ? (sent > 0 ? 'partial' : 'failed') : 'sent'

  await session.supabase.from('admin_broadcasts').insert({
    actor_id: actor.id,
    subject,
    body,
    audience,
    recipient_count: sent,
    provider: 'resend',
    status,
    error: failure,
  })
  await recordAdminAction(session.supabase, actor, 'broadcast.send', audience, {
    subject,
    recipients: recipients.length,
    sent,
    status,
  })
  revalidatePath('/admin/broadcast')

  if (failure) {
    return { error: `Sent to ${sent} of ${recipients.length}. ${failure}` }
  }
  return { ok: `Sent to ${sent} recipient${sent === 1 ? '' : 's'}.` }
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function updateFeedbackStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const status = text(formData, 'status')
  if (!isUuid(id)) return { error: 'That feedback could not be found.' }
  if (!(FEEDBACK_STATUSES as readonly string[]).includes(status)) return { error: 'Unknown status.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }

  const { error } = await session.supabase.from('feedback').update({ status }).eq('id', id)
  if (error) {
    console.error('update feedback failed:', error.message)
    return { error: 'Could not update the feedback — please try again.' }
  }

  await recordAdminAction(
    session.supabase,
    { id: session.claims.sub, email: session.claims.email },
    'feedback.status',
    id,
    { status }
  )
  revalidatePath('/admin/feedback')
  return { ok: 'Feedback updated.' }
}

export async function deleteFeedback(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That feedback could not be found.' }

  const session = await adminSession()
  if (!session) return { error: 'You are not authorized to do that.' }

  const { error } = await session.supabase.from('feedback').delete().eq('id', id)
  if (error) {
    console.error('delete feedback failed:', error.message)
    return { error: 'Could not delete the feedback — please try again.' }
  }

  await recordAdminAction(
    session.supabase,
    { id: session.claims.sub, email: session.claims.email },
    'feedback.delete',
    id
  )
  revalidatePath('/admin/feedback')
  return { ok: 'Feedback deleted.' }
}
