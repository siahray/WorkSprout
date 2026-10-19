'use server'

import { logError } from '@/lib/log'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { removeAttachmentObjects } from '@/lib/attachments-server'
import {
  ATTACHMENT_BUCKET,
  MAX_ATTACHMENT_BYTES,
  isAllowedMimeType,
  type AttachmentParentType,
} from '@/lib/attachments'
import { isUuid, text, type FormState } from '@/lib/validation'

type RecordInput = {
  parentType: AttachmentParentType
  parentId: string
  path: string
  name: string
  mimeType: string
  size: number
}

function revalidateParent(parentType: AttachmentParentType, parentId: string) {
  // Expenses have no detail page — the receipts live on the list.
  if (parentType === 'project') revalidatePath(`/projects/${parentId}`)
  else if (parentType === 'invoice') revalidatePath(`/invoices/${parentId}`)
  else revalidatePath('/expenses')
}

// The table each parent type lives in, for the ownership probe below.
const PARENT_TABLE: Record<AttachmentParentType, string> = {
  project: 'projects',
  invoice: 'invoices',
  expense: 'expenses',
}

// Called after the browser uploads a file straight to Storage. The path is
// re-derived from the caller's id so a user can only ever register files that
// live under their own folder, and the object is confirmed to exist.
export async function recordAttachment(input: RecordInput): Promise<FormState> {
  const parentType = input.parentType
  const parentId = String(input.parentId ?? '')
  const path = String(input.path ?? '')
  const name = String(input.name ?? '').trim().slice(0, 255)
  const mimeType = String(input.mimeType ?? '')
  const size = Number(input.size ?? 0)

  if (parentType !== 'project' && parentType !== 'invoice' && parentType !== 'expense') {
    return { error: 'Unknown upload target.' }
  }
  if (!isUuid(parentId)) return { error: 'That upload target could not be found.' }
  if (!name) return { error: 'The file needs a name.' }
  if (!isAllowedMimeType(mimeType)) return { error: 'That file type is not supported.' }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
    return { error: 'That file is larger than the 10 MB limit.' }
  }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  if (!path.startsWith(`${userId}/${parentType}/${parentId}/`)) {
    return { error: 'That upload could not be verified.' }
  }

  // The parent must belong to the caller (the table policy also enforces this).
  const { data: parent } = await supabase
    .from(PARENT_TABLE[parentType])
    .select('id')
    .eq('id', parentId)
    .maybeSingle()
  if (!parent) return { error: 'That upload target could not be found.' }

  // Confirm the object actually landed in Storage.
  const slash = path.lastIndexOf('/')
  const { data: objects } = await supabase
    .storage.from(ATTACHMENT_BUCKET)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 })
  if (!objects?.some((object) => object.name === path.slice(slash + 1))) {
    return { error: 'The upload did not complete — please try again.' }
  }

  const { error } = await supabase.from('attachments').insert({
    user_id: userId,
    project_id: parentType === 'project' ? parentId : null,
    invoice_id: parentType === 'invoice' ? parentId : null,
    expense_id: parentType === 'expense' ? parentId : null,
    name,
    path,
    mime_type: mimeType,
    size_bytes: Math.round(size),
  })

  if (error) {
    // A duplicate path means the row was already recorded; treat as success.
    if (error.code === '23505') return { ok: 'File added.' }
    logError('record attachment failed', { error })
    return { error: 'Could not save the file — please try again.' }
  }

  revalidateParent(parentType, parentId)
  return { ok: 'File added.' }
}

export async function deleteAttachment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That file could not be found.' }

  const supabase = await createClient()
  const { data: attachment } = await supabase
    .from('attachments')
    .select('id, path, project_id, invoice_id, expense_id')
    .eq('id', id)
    .maybeSingle()

  if (!attachment) return { error: 'That file could not be found.' }

  await removeAttachmentObjects(supabase, [attachment.path])
  const { error } = await supabase.from('attachments').delete().eq('id', id)
  if (error) {
    logError('delete attachment failed', { error })
    return { error: 'Could not remove the file — please try again.' }
  }

  if (attachment.project_id) revalidatePath(`/projects/${attachment.project_id}`)
  if (attachment.invoice_id) revalidatePath(`/invoices/${attachment.invoice_id}`)
  if (attachment.expense_id) revalidatePath('/expenses')
  return { ok: 'File removed.' }
}
