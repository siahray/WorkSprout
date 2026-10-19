'use server'

import { logError } from '@/lib/log'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ResetState = { error?: string }

// Sets the new password on the session the recovery link established. There is
// no "current password" check here — control of the emailed link is the proof.
export async function setNewPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const next = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm_password') ?? '')

  if (next.length < 8) return { error: 'Choose a password with at least 8 characters.' }
  if (next !== confirm) return { error: 'The passwords do not match.' }

  const supabase = await createClient()

  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    return { error: 'That link expired — request a new one.' }
  }

  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) {
    if (/different|same password/i.test(error.message)) {
      return { error: 'Choose a password different from your current one.' }
    }
    logError('password reset failed', { error })
    return { error: 'Could not update your password — please try again.' }
  }

  // The recovery link left them signed in, so they land in the app directly.
  redirect('/dashboard')
}
