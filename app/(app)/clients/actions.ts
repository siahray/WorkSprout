'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { attachmentPathsForProjectIds, removeAttachmentObjects } from '@/lib/attachments-server'
import { createClientRecord } from '@/lib/api-mutations'
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
  const supabase = await createSupabaseClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  // Shared with the integration API, so the form and the API cannot drift.
  const result = await createClientRecord(supabase, userId, readClient(formData))
  if (!result.ok) return { error: result.error }

  revalidatePath('/clients')
  redirect(`/clients/${result.value.id}`)
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

// Archive is the gentle alternative to delete: the client leaves every list
// and picker, while everything they own stays exactly as it is. The update is
// RLS-scoped to the owner, and `.select()` proves the row landed — and was
// visible to this session — before we claim success.
async function setArchived(id: string, archived: boolean): Promise<FormState> {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase
    .from('clients')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error(`${archived ? 'archive' : 'restore'} client failed:`, error.message)
    return { error: 'Could not update that client — please try again.' }
  }
  if (!data) return { error: 'That client could not be found.' }

  revalidatePath('/clients')
  revalidatePath(`/clients/${id}`)
  return { ok: archived ? 'Client archived.' : 'Client restored.' }
}

export async function archiveClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That client could not be found.' }
  return setArchived(id, true)
}

export async function restoreClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That client could not be found.' }
  return setArchived(id, false)
}

export async function deleteClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That client could not be found.' }

  const supabase = await createSupabaseClient()

  // Deleting the client cascades its projects (and attachment rows), so remove
  // the underlying Storage objects first.
  const { data: projects } = await supabase.from('projects').select('id').eq('client_id', id)
  await removeAttachmentObjects(
    supabase,
    await attachmentPathsForProjectIds(supabase, (projects ?? []).map((p) => p.id)),
  )

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
