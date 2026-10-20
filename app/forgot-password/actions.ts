'use server'

import { logError } from '@/lib/log'
import { siteUrl } from '@/lib/site'
import { generateAuthLink } from '@/lib/auth-link'
import { renderResetEmail } from '@/lib/auth-email'
import { emailConfigured, sendEmail } from '@/lib/email'

// `email` is echoed back on errors so the form keeps what the user typed.
export type ForgotState = { error?: string; email?: string; sent?: boolean }

// Requests a password-reset link, which we send ourselves rather than asking
// Supabase to email it — the message is WorkSprout's design and sender.
//
// The request deliberately does not go through the PKCE client: a PKCE request
// yields a `code` that only the browser which asked for the email can exchange.
// Without it, the link comes back as a session in the URL hash that
// /auth/confirm completes in whatever browser — or on whatever device — opened
// the email.
//
// Success is reported whether or not the email was recognised — returning a
// different message for unknown accounts would let anyone probe which emails
// have WorkSprout accounts. That holds for the not-configured and send-failure
// cases too: the response shape must not depend on whether the address exists.
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  if (!emailConfigured()) {
    logError('password reset requested but email is not configured')
    return { sent: true, email }
  }

  const origin = await siteUrl()

  const link = await generateAuthLink({
    kind: 'recovery',
    email,
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })

  // Unknown addresses come back as an error from generateLink. The caller must
  // not be able to tell, so this is logged and answered exactly like success.
  if (!link.ok) {
    if (!link.notConfigured) logError('password reset link failed', { error: link.error })
    return { sent: true, email }
  }

  const { subject, html, text } = renderResetEmail({ link: link.actionLink })
  const sent = await sendEmail({ to: email, subject, html, text })

  if (!sent.ok) {
    // Rate limiting is the one case worth reporting honestly — it tells the
    // person to retry rather than to check an inbox nothing was sent to, and it
    // fires the same way for an unknown address.
    if (/rate limit/i.test(sent.error)) {
      return { error: 'Too many requests — wait a minute and try again.', email }
    }
    logError('password reset send failed', { error: sent.error })
  }

  return { sent: true, email }
}
