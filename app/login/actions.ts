'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// `email` is echoed back on errors so the form keeps what the user typed.
export type LoginState = { error?: string; email?: string }

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter your email and password.', email }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (/not confirmed/i.test(error.message)) {
      return { error: 'Confirm your email first — check your inbox for the link.', email }
    }
    if (error.code === 'invalid_credentials' || /invalid login credentials/i.test(error.message)) {
      return { error: 'Invalid email or password.', email }
    }
    console.error('login failed:', error.message)
    return { error: 'Could not sign you in — please try again.', email }
  }

  redirect('/dashboard')
}