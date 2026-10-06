'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type JoinState = { error?: string }

export async function joinBeta(_prevState: JoinState, formData: FormData): Promise<JoinState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const profession = String(formData.get('profession') ?? '').trim()
  const source = String(formData.get('source') ?? 'beta-landing').trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' }
  }
  if (!profession) {
    return { error: 'Tell us what you do — it helps us plan the beta.' }
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
      return { error: "You're already on the beta list with this email." }
    }
    console.error('beta signup failed:', error.message)
    return { error: 'Something went wrong — please try again.' }
  }

  redirect(`/join/success?email=${encodeURIComponent(email)}`)
}
