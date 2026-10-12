'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { round2, type Tax } from '@/lib/tax'
import { optionalText, text, type FormState } from '@/lib/validation'

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = optionalText(formData, 'full_name')
  const businessName = optionalText(formData, 'business_name')
  const businessAddress = optionalText(formData, 'business_address')
  const businessPhone = optionalText(formData, 'business_phone')

  let rawTaxes: unknown
  try {
    rawTaxes = JSON.parse(text(formData, 'taxes') || '[]')
  } catch {
    return { error: 'Those tax settings could not be read — please try again.' }
  }
  if (!Array.isArray(rawTaxes)) return { error: 'Those tax settings could not be read — please try again.' }

  const taxes: Tax[] = []
  for (const entry of rawTaxes) {
    if (!entry || typeof entry !== 'object') continue
    const label = String((entry as { label?: unknown }).label ?? '').trim()
    const rate = Number((entry as { rate?: unknown }).rate)
    if (!label) continue
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
      return { error: `Enter a rate between 0 and 100 for "${label}".` }
    }
    taxes.push({ label: label.slice(0, 60), rate: round2(rate) })
  }
  if (taxes.length > 12) return { error: 'You can add up to 12 taxes.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      business_name: businessName,
      business_address: businessAddress,
      business_phone: businessPhone,
      taxes,
    })
    .eq('id', userId)

  if (error) {
    console.error('update profile failed:', error.message)
    return { error: 'Could not save your settings — please try again.' }
  }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  return { ok: 'Settings saved.' }
}

// Changes the signed-in user's password. The current password is verified by
// re-authenticating first, then the new one is set on the session user.
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = String(formData.get('current_password') ?? '')
  const next = String(formData.get('new_password') ?? '')
  const confirm = String(formData.get('confirm_password') ?? '')

  if (!current) return { error: 'Enter your current password.' }
  if (next.length < 8) return { error: 'Choose a new password with at least 8 characters.' }
  if (next !== confirm) return { error: 'The new passwords do not match.' }
  if (next === current) return { error: 'Your new password must differ from your current one.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const email = claimsData?.claims?.email
  if (!email) return { error: 'Your session expired — sign in again.' }

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: current })
  if (verifyError) {
    if (verifyError.code === 'invalid_credentials' || /invalid login credentials/i.test(verifyError.message)) {
      return { error: 'Your current password is incorrect.' }
    }
    console.error('password verify failed:', verifyError.message)
    return { error: 'Could not verify your current password — please try again.' }
  }

  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) {
    if (/different|same password/i.test(error.message)) {
      return { error: 'Your new password must differ from your current one.' }
    }
    console.error('password update failed:', error.message)
    return { error: 'Could not update your password — please try again.' }
  }

  return { ok: 'Password updated.' }
}
