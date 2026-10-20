'use server'

import { logError } from '@/lib/log'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateAuthLink } from '@/lib/auth-link'
import { renderInviteEmail } from '@/lib/auth-email'
import { emailConfigured, sendEmail } from '@/lib/email'
import { recordAdminAction } from './audit'

export type InviteState = { error?: string; ok?: string; email?: string }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Admin-only: email a link that lets an invited person set their own password.
//
// The link is minted here and sent through Resend, so the message carries our
// design and our sender rather than Supabase's template. `generateLink` is the
// same URL Supabase would have emailed — it just does not send it. The link
// still lands on /auth/confirm, which turns it into a session and hands the
// invitee to the set-password form.
//
// If the host is not in Supabase's redirect allow-list (localhost included,
// measured) the session lands on the site root instead, which AuthLinkCatcher
// picks up.
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

  if (!emailConfigured()) {
    return { error: 'Email is not configured yet. Add RESEND_API_KEY and EMAIL_FROM.', email }
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
    logError('invite record failed', { error: recordError })
    return { error: 'Could not record the invite — please try again.', email }
  }

  const h = await headers()
  const host = h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const emailRedirectTo = host
    ? `${proto}://${host}/auth/confirm?next=/reset-password`
    : undefined

  if (!emailRedirectTo) {
    return { error: 'Could not determine where to send the invite — please try again.', email }
  }

  const link = await generateAuthLink({ kind: 'invite', email, redirectTo: emailRedirectTo })
  if (!link.ok) return { error: link.error, email }

  const { subject, html, text } = renderInviteEmail({
    link: link.actionLink,
    invitedBy: claims.email ?? null,
  })

  const sent = await sendEmail({ to: email, subject, html, text })
  if (!sent.ok) return { error: sent.error, email }

  await recordAdminAction(supabase, { id: claims.sub, email: claims.email }, 'invite.send', email)

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
