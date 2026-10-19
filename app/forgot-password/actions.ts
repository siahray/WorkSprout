'use server'

import { logError } from '@/lib/log'
import { createClient } from '@/lib/supabase/server'
import { siteUrl } from '@/lib/site'

// `email` is echoed back on errors so the form keeps what the user typed.
export type ForgotState = { error?: string; email?: string; sent?: boolean }

// Requests a password-reset link. Supabase sends it, so this rides the same
// channel as invite OTPs and is independent of the app's Resend config.
//
// Success is reported whether or not the email was recognised — returning a
// different message for unknown accounts would let anyone probe which emails
// have WorkSprout accounts.
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  const supabase = await createClient()
  const origin = await siteUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  if (error) {
    // Supabase rate-limits reset requests; that one is worth telling them about.
    // Anything else still looks like success, per the note above.
    if (/rate limit/i.test(error.message)) {
      return { error: 'Too many requests — wait a minute and try again.', email }
    }
    logError('password reset request failed', { error })
  }

  return { sent: true, email }
}
