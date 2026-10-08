'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { isEmail, isUuid, optionalText, text, type FormState } from '@/lib/validation'

function readClient(formData: FormData) {
  return {
    name: text(formData, 'name'),
    company: optionalText(formData, 'company'),
    email: optionalText(formData, 'email'),
    address: optionalText(formData, 'address'),
    tax_id: optionalText(formData, 'tax_id'),
    notes: optionalText(formData, 'notes'),
  }
}

export async function createClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = readClient(formData)

  if (!values.name) return { error: 'Client name is required.' }
  if (values.email && !isEmail(values.email)) {
    return { error: 'Enter a valid email address, or leave it blank.' }
  }

  const supabase = await createSupabaseClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return { error: 'Your session expired — sign in again.' }

  const { data: inserted, error } = await supabase
    .from('clients')
    .insert({ ...values, user_id: data.claims.sub })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('create client failed:', error?.message)
    return { error: 'Could not save the client — please try again.' }
  }

  revalidatePath('/clients')
  redirect(`/clients/${inserted.id}`)
}

export async function updateClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const values = readClient(formData)

  if (!isUuid(id)) return { error: 'That client could not be found.' }
  if (!values.name) return { error: 'Client name is required.' }
  if (values.email && !isEmail(values.email)) {
    return { error: 'Enter a valid email address, or leave it blank.' }
  }

  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('clients').update(values).eq('id', id)

  if (error) {
    console.error('update client failed:', error.message)
    return { error: 'Could not save the client — please try again.' }
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  redirect(`/clients/${id}`)
}

export async function deleteClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That client could not be found.' }

  const supabase = await createSupabaseClient()
  const { error } = await supabase.from('clients').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return { error: 'This client has invoices. Void or delete those first.' }
    }
    console.error('delete client failed:', error.message)
    return { error: 'Could not delete the client — please try again.' }
  }

  revalidatePath('/clients')
  redirect('/clients')
}
