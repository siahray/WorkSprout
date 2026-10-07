'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { optionalText, text, type FormState } from '@/lib/validation'

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const fullName = optionalText(formData, 'full_name')
  const businessName = optionalText(formData, 'business_name')
  const businessAddress = optionalText(formData, 'business_address')
  const businessPhone = optionalText(formData, 'business_phone')
  const taxLabel = text(formData, 'tax_label') || 'VAT'

  const taxRaw = text(formData, 'tax_rate').replace(/[%₱,\s]/g, '')
  const taxRate = taxRaw === '' ? 0 : Number(taxRaw)
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: 'Enter a tax rate between 0 and 100.' }
  }

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
      tax_label: taxLabel,
      tax_rate: Math.round(taxRate * 100) / 100,
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
