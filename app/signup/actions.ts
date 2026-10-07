'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// `fullName` and `email` are echoed back on errors so the form keeps what the user typed.
export type SignupState = { error?: string; fullName?: string; email?: string }

// Beta access is invite-only: an admin emails a one-time OTP. The invitee proves
// it here, then sets the password they will use for every later login.
export async function signup(_prevState: SignupState, formData: FormData): Promise<SignupState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const token = String(formData.get('token') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const fail = (error: string): SignupState => ({ error, fullName, email })

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email address.')
  }
  if (!token) {
    return fail('Enter the one-time code from your invite email.')
  }
  if (password.length < 8) {
    return fail('Choose a password with at least 8 characters.')
  }

  const supabase = await createClient()

  const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' })

  if (verifyError) {
    if (verifyError.code === 'otp_expired' || /expired|invalid/i.test(verifyError.message)) {
      return fail('That code is invalid or has expired — ask the WorkSprout team for a new invite.')
    }
    console.error('otp verify failed:', verifyError.message)
    return fail('Could not verify your code — please try again.')
  }

  const { data, error: passwordError } = await supabase.auth.updateUser({
    password,
    data: { full_name: fullName },
  })

  if (passwordError) {
    if (passwordError.code === 'weak_password' || /password/i.test(passwordError.message)) {
      return fail('Choose a stronger password (at least 8 characters).')
    }
    console.error('set password failed:', passwordError.message)
    return fail('Could not set your password — please try again.')
  }

  const userId = data.user?.id
  if (userId && fullName) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)
    if (profileError) console.error('profile update failed:', profileError.message)
  }

  redirect('/dashboard')
}
