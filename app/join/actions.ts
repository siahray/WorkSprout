'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// `fullName` and `email` are echoed back on errors so the form keeps what the user typed.
export type JoinState = { error?: string; fullName?: string; email?: string }

export async function joinBeta(_prevState: JoinState, formData: FormData): Promise<JoinState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const profession = String(formData.get('profession') ?? '').trim()
  const source = String(formData.get('source') ?? 'beta-landing').trim()

  const fail = (error: string): JoinState => ({ error, fullName, email })

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return fail('Enter a valid email address.')
  }
  if (!profession) {
    return fail('Tell us what you do — it helps us plan the beta.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('beta_signups').insert({
    email,
    full_name: fullName || null,
    profession,
    source,
  })

  if (error) {
    if (error.code === '23505') {
      return fail("You're already on the beta list with this email.")
    }
    console.error('beta signup failed:', error.message)
    return fail('Something went wrong — please try again.')
  }

  redirect(`/join/success?email=${encodeURIComponent(email)}`)
}