'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// `fullName` and `email` are echoed back on errors so the form keeps what the user typed.
export type SignupState = { error?: string; fullName?: string; email?: string }

export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')

  const fail = (error: string): SignupState => ({ error, fullName, email })

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email address.')
  }
  if (password.length < 8) {
    return fail('Password must be at least 8 characters.')
  }

  const supabase = await createClient()

  const { data: onList, error: gateError } = await supabase.rpc('is_beta_signup', { p_email: email })
  if (gateError) {
    console.error('beta gate check failed:', gateError.message)
    return fail('Something went wrong — please try again.')
  }
  if (!onList) {
    return fail("This email isn't on the beta list yet — join the beta first.")
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })

  if (error) {
    if (error.code === 'user_already_exists' || /already registered/i.test(error.message)) {
      return fail('An account with this email already exists — log in instead.')
    }
    if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
      return fail('Too many attempts just now — wait a few minutes and try again.')
    }
    if (error.code === 'weak_password' || /password/i.test(error.message)) {
      return fail('Choose a stronger password (at least 8 characters).')
    }
    console.error('signup failed:', error.message)
    return fail('Could not create your account — please try again.')
  }

  if (data.session) redirect('/dashboard')
  redirect(`/signup/check-email?email=${encodeURIComponent(email)}`)
}