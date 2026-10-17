'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-keys'
import { round2, type Tax } from '@/lib/tax'
import { isUuid, optionalText, text, type FormState } from '@/lib/validation'

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

// API keys authenticate the integration API (openapi/work-sprout.v1.yaml) for
// external tools. Unlike FormState this carries the raw key back, because it is
// shown exactly once: only a hash is stored, so it can never be displayed again.
export type ApiKeyFormState = FormState & {
  createdKey?: string
  createdName?: string
}

const MAX_ACTIVE_KEYS = 10

export async function createApiKey(
  _prev: ApiKeyFormState,
  formData: FormData,
): Promise<ApiKeyFormState> {
  const name = text(formData, 'name') || 'API key'
  if (name.length > 80) return { error: 'Give the key a name of 80 characters or fewer.' }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  // A modest ceiling keeps a stray loop from piling up live credentials.
  const { count, error: countError } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (countError) {
    console.error('count api keys failed:', countError.message)
    return { error: 'Could not create the key — please try again.' }
  }
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return { error: `You already have ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` }
  }

  const { raw, hash, prefix } = generateApiKey()
  // `.select()` so a row that silently fails to land is an error, not a success.
  const { data: inserted, error } = await supabase
    .from('api_keys')
    .insert({ user_id: userId, name, key_hash: hash, prefix })
    .select('id')
    .maybeSingle()
  if (error || !inserted) {
    console.error('create api key failed:', error?.message)
    return { error: 'Could not create the key — please try again.' }
  }

  revalidatePath('/settings')
  return {
    ok: 'Key created. Copy it now — it will not be shown again.',
    createdKey: raw,
    createdName: name,
  }
}

export async function revokeApiKey(id: string): Promise<void> {
  if (!isUuid(id)) return

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return

  // Revoked rather than deleted, so the row survives as an audit trail and
  // `last_used_at` still shows when the key was last seen.
  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .is('revoked_at', null)
  if (error) console.error('revoke api key failed:', error.message)

  revalidatePath('/settings')
}
