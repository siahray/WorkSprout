'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAuthClient, createClient } from '@/lib/supabase/server'

export type InviteState = { error?: string; ok?: string; email?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Admin-only: email a one-time OTP that lets an invited person create their
// account. The client here is session-less so sending the OTP never disturbs
// the signed-in admin's own session.
export async function sendInvite(_prevState: InviteState, formData: FormData): Promise<InviteState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    return { error: 'Enter a valid email address.', email }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claims?.app_metadata?.role !== 'admin') {
    return { error: 'You are not authorized to send invites.', email }
  }

  const { error: recordError } = await supabase.from('beta_signups').upsert(
    {
      email,
      source: 'admin-invite',
      invited_at: new Date().toISOString(),
      invited_by: claims.sub,
    },
    { onConflict: 'email' }
  )

  if (recordError) {
    console.error('invite record failed:', recordError.message)
    return { error: 'Could not record the invite — please try again.', email }
  }

  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const emailRedirectTo = host ? `${proto}://${host}/signup?email=${encodeURIComponent(email)}` : undefined

  const auth = createAuthClient()
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo },
  })

  if (error) {
    if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
      return { error: 'Too many invites just now — wait a few minutes and try again.', email }
    }
    console.error('invite email failed:', error.message)
    return { error: 'Could not send the invite email — please try again.', email }
  }

  revalidatePath('/admin')
  return { ok: `Invite sent to ${email}.`, email }
}

export async function login(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  if (data.user?.app_metadata?.role !== 'admin') {
    await supabase.auth.signOut()
    return { error: 'This account does not have admin access.' }
  }

  redirect('/admin')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
