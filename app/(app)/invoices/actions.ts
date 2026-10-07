'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { decimalHours } from '@/lib/format'
import { isUuid, optionalText, text, type FormState } from '@/lib/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type TimeLine = { kind: 'time'; description?: string; entry_ids?: unknown }
type ManualLine = { kind: 'manual'; description?: string; quantity?: unknown; unit_rate?: unknown }
type Line = TimeLine | ManualLine

type EntryRateRow = {
  id: string
  duration_minutes: number | null
  billable: boolean
  invoice_id: string | null
  task: { project: { hourly_rate: number | string | null } | null } | null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export async function createInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const clientId = text(formData, 'client_id')
  const projectId = optionalText(formData, 'project_id')
  const issueDate = text(formData, 'issue_date')
  const dueDate = optionalText(formData, 'due_date')
  const notes = optionalText(formData, 'notes')

  if (!isUuid(clientId)) return { error: 'Choose a client for this invoice.' }
  if (!DATE_RE.test(issueDate)) return { error: 'Enter a valid issue date.' }
  if (dueDate && !DATE_RE.test(dueDate)) return { error: 'Enter a valid due date, or leave it blank.' }

  let lines: Line[]
  try {
    const parsed = JSON.parse(String(formData.get('lines') ?? '[]'))
    if (!Array.isArray(parsed)) throw new Error('not an array')
    lines = parsed as Line[]
  } catch {
    return { error: 'Those invoice lines could not be read — please rebuild the invoice.' }
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const userId = data?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  const { data: client } = await supabase.from('clients').select('id').eq('id', clientId).maybeSingle()
  if (!client) return { error: 'That client could not be found.' }

  const { data: profile } = await supabase.from('profiles').select('tax_rate, tax_label').eq('id', userId).maybeSingle()
  const taxRate = Number(profile?.tax_rate ?? 0)
  const taxLabel = profile?.tax_label ?? 'VAT'

  // --- Time lines: recompute from the real entries so amounts cannot be spoofed.
  const timeLines = lines.filter((l): l is TimeLine => l.kind === 'time')
  const allEntryIds = timeLines.flatMap((l) =>
    Array.isArray(l.entry_ids) ? l.entry_ids.filter((id): id is string => typeof id === 'string' && isUuid(id)) : []
  )

  const entriesById = new Map<string, EntryRateRow>()
  if (allEntryIds.length) {
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select('id, duration_minutes, billable, invoice_id, task:tasks(project:projects(hourly_rate))')
      .in('id', allEntryIds)
    if (error) {
      console.error('load invoice time entries failed:', error.message)
      return { error: 'Could not read the tracked time — please try again.' }
    }
    for (const row of (entries ?? []) as unknown as EntryRateRow[]) {
      if (row.billable && row.invoice_id === null) entriesById.set(row.id, row)
    }
  }

  const items: { description: string; quantity: number; unit_rate: number }[] = []
  const linkedEntryIds: string[] = []

  for (const line of timeLines) {
    const ids = Array.isArray(line.entry_ids) ? line.entry_ids.filter((id): id is string => typeof id === 'string') : []
    const valid = ids.map((id) => entriesById.get(id)).filter((e): e is EntryRateRow => Boolean(e))
    if (valid.length === 0) continue

    const minutes = valid.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
    const quantity = decimalHours(minutes)
    if (quantity <= 0) continue

    const rate = Number(valid[0].task?.project?.hourly_rate ?? 0)
    items.push({
      description: line.description?.trim() || 'Tracked time',
      quantity,
      unit_rate: round2(rate),
    })
    linkedEntryIds.push(...valid.map((e) => e.id))
  }

  // --- Manual lines: validate the numbers the user typed.
  for (const line of lines) {
    if (line.kind !== 'manual') continue
    const description = typeof line.description === 'string' ? line.description.trim() : ''
    const quantity = Number(line.quantity)
    const unitRate = Number(line.unit_rate)
    if (!description && !quantity) continue
    if (!Number.isFinite(quantity) || quantity < 0) return { error: 'A manual line has an invalid quantity.' }
    if (!Number.isFinite(unitRate) || unitRate < 0) return { error: 'A manual line has an invalid rate.' }
    if (quantity <= 0) continue
    items.push({ description: description || 'Item', quantity: round2(quantity), unit_rate: round2(unitRate) })
  }

  if (items.length === 0) return { error: 'Add at least one line with an amount before saving.' }

  const subtotal = round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unit_rate), 0))
  const taxAmount = round2((subtotal * taxRate) / 100)
  const total = round2(subtotal + taxAmount)

  // --- Number: INV-0001, retrying if two people collide.
  const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true })
  const nextNumber = (count ?? 0) + 1
  let invoiceId: string | null = null

  for (let attempt = 0; attempt < 5 && !invoiceId; attempt += 1) {
    const number = `INV-${String(nextNumber + attempt).padStart(4, '0')}`
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        user_id: userId,
        client_id: clientId,
        project_id: projectId && isUuid(projectId) ? projectId : null,
        number,
        status: 'draft',
        issue_date: issueDate,
        due_date: dueDate || null,
        currency: 'PHP',
        tax_rate: taxRate,
        tax_label: taxLabel,
        subtotal,
        tax_amount: taxAmount,
        total,
        notes,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') continue
      console.error('create invoice failed:', error.message)
      return { error: 'Could not save the invoice — please try again.' }
    }
    invoiceId = invoice!.id
  }

  if (!invoiceId) return { error: 'Could not allocate an invoice number — please try again.' }

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(items.map((item) => ({ ...item, invoice_id: invoiceId })))

  if (itemsError) {
    console.error('create invoice items failed:', itemsError.message)
    await supabase.from('invoices').delete().eq('id', invoiceId)
    return { error: 'Could not save the invoice lines — please try again.' }
  }

  if (linkedEntryIds.length) {
    const { error: linkError } = await supabase
      .from('time_entries')
      .update({ invoice_id: invoiceId })
      .in('id', linkedEntryIds)
    if (linkError) console.error('link time entries failed:', linkError.message)
  }

  revalidatePath('/invoices')
  revalidatePath('/time')
  revalidatePath('/dashboard')
  redirect(`/invoices/${invoiceId}`)
}

export async function markInvoiceSent(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That invoice could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('invoices').update({ status: 'sent' }).eq('id', id).eq('status', 'draft')
  if (error) {
    console.error('mark invoice sent failed:', error.message)
    return { error: 'Could not update the invoice — please try again.' }
  }

  revalidatePath(`/invoices/${id}`)
  revalidatePath('/invoices')
  return { ok: 'Invoice marked as sent.' }
}

export async function voidInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That invoice could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('invoices').update({ status: 'void' }).eq('id', id)
  if (error) {
    console.error('void invoice failed:', error.message)
    return { error: 'Could not void the invoice — please try again.' }
  }

  // Return the tracked time to the unbilled pool.
  await supabase.from('time_entries').update({ invoice_id: null }).eq('invoice_id', id)

  revalidatePath(`/invoices/${id}`)
  revalidatePath('/invoices')
  revalidatePath('/time')
  return { ok: 'Invoice voided. Its time is available to bill again.' }
}

export async function deleteInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That invoice could not be found.' }

  const supabase = await createClient()
  const { data: invoice } = await supabase.from('invoices').select('status').eq('id', id).maybeSingle()
  if (!invoice) return { error: 'That invoice could not be found.' }
  if (invoice.status !== 'draft') {
    return { error: 'Only draft invoices can be deleted. Void a sent invoice instead.' }
  }

  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('status', 'draft')
  if (error) {
    console.error('delete invoice failed:', error.message)
    return { error: 'Could not delete the invoice — please try again.' }
  }

  revalidatePath('/invoices')
  revalidatePath('/time')
  redirect('/invoices')
}

export async function addPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const invoiceId = text(formData, 'invoice_id')
  const paidAt = text(formData, 'paid_at')
  const method = optionalText(formData, 'method')
  const note = optionalText(formData, 'note')

  if (!isUuid(invoiceId)) return { error: 'That invoice could not be found.' }
  if (!DATE_RE.test(paidAt)) return { error: 'Enter a valid payment date.' }

  const rawAmount = String(formData.get('amount') ?? '').replace(/[₱,\s]/g, '').replace(/^p/i, '')
  const amount = Number(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter a payment amount greater than zero.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  const { data: invoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).maybeSingle()
  if (!invoice) return { error: 'That invoice could not be found.' }
  if (invoice.status === 'void') return { error: 'You cannot record a payment against a void invoice.' }

  const { error } = await supabase.from('payments').insert({
    user_id: userId,
    invoice_id: invoiceId,
    amount: round2(amount),
    paid_at: paidAt,
    method,
    note,
  })

  if (error) {
    console.error('add payment failed:', error.message)
    return { error: 'Could not record the payment — please try again.' }
  }

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { ok: 'Payment recorded.' }
}

export async function deletePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const invoiceId = text(formData, 'invoice_id')
  if (!isUuid(id)) return { error: 'That payment could not be found.' }

  const supabase = await createClient()
  const { error } = await supabase.from('payments').delete().eq('id', id)

  if (error) {
    console.error('delete payment failed:', error.message)
    return { error: 'Could not delete the payment — please try again.' }
  }

  if (isUuid(invoiceId)) revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { ok: 'Payment removed.' }
}
