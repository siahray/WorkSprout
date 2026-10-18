'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { claimFormSubmission, releaseFormClaim, storeFormResponse } from '@/lib/form-idempotency'
import { attachmentPathsForParent, removeAttachmentObjects } from '@/lib/attachments-server'
import { decimalHours } from '@/lib/format'
import { coerceTaxes, round2, taxTotal } from '@/lib/tax'
import { emailConfigured, sendEmail } from '@/lib/email'
import { fetchInvoiceSnapshot } from '@/lib/invoice'
import { renderInvoiceEmail } from '@/lib/invoice-email'
import { buildInvoicePdf } from '@/lib/invoice-pdf'
import { siteUrl } from '@/lib/site'
import { isEmail, isUuid, money, optionalText, text, type FormState } from '@/lib/validation'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

type TimeLine = { kind: 'time'; description?: string; entry_ids?: unknown }
type ManualLine = { kind: 'manual'; description?: string; quantity?: unknown; unit_rate?: unknown }
type Line = TimeLine | ManualLine

type EntryRateRow = {
  id: string
  duration_minutes: number | null
  billable: boolean
  invoice_id: string | null
  task:
    | {
        project: { id: string; name: string; hourly_rate: number | string | null; fixed_rate: number | string | null } | null
      }
    | null
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

  const { data: profile } = await supabase.from('profiles').select('taxes').eq('id', userId).maybeSingle()
  const taxes = coerceTaxes(profile?.taxes)

  // --- Time lines: recompute from the real entries so amounts cannot be spoofed.
  const timeLines = lines.filter((l): l is TimeLine => l.kind === 'time')
  const allEntryIds = timeLines.flatMap((l) =>
    Array.isArray(l.entry_ids) ? l.entry_ids.filter((id): id is string => typeof id === 'string' && isUuid(id)) : []
  )

  const entriesById = new Map<string, EntryRateRow>()
  if (allEntryIds.length) {
    const { data: entries, error } = await supabase
      .from('time_entries')
      .select(
        'id, duration_minutes, billable, invoice_id, task:tasks(project:projects(id, name, hourly_rate, fixed_rate))',
      )
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

  // Fixed-price projects bill once, no matter how many tasks or hours were tracked.
  const fixedByProject = new Map<string, { name: string; unitRate: number; entryIds: string[] }>()
  // Remainder: hourly (or unrated) time, grouped per line.
  const hourlyLines: { description: string; minutes: number; rate: number; entryIds: string[] }[] = []

  for (const line of timeLines) {
    const ids = Array.isArray(line.entry_ids) ? line.entry_ids.filter((id): id is string => typeof id === 'string') : []
    const valid = ids.map((id) => entriesById.get(id)).filter((e): e is EntryRateRow => Boolean(e))
    if (valid.length === 0) continue

    for (const e of valid) {
      const fixedProject = e.task?.project
      const fixedRate = fixedProject ? Number(fixedProject.fixed_rate ?? 0) : 0
      if (fixedRate > 0 && fixedProject) {
        const existing = fixedByProject.get(fixedProject.id)
        if (existing) existing.entryIds.push(e.id)
        else
          fixedByProject.set(fixedProject.id, {
            name: fixedProject.name,
            unitRate: fixedRate,
            entryIds: [e.id],
          })
      }
    }

    const hourly = valid.filter((e) => Number(e.task?.project?.fixed_rate ?? 0) <= 0)
    const minutes = hourly.reduce((sum, e) => sum + (e.duration_minutes ?? 0), 0)
    if (minutes > 0) {
      hourlyLines.push({
        description: line.description?.trim() || 'Tracked time',
        minutes,
        rate: Number(hourly[0].task?.project?.hourly_rate ?? 0),
        entryIds: hourly.map((e) => e.id),
      })
    }
  }

  for (const fixed of fixedByProject.values()) {
    if (fixed.unitRate > 0) {
      items.push({
        description: `${fixed.name} — fixed price`,
        quantity: 1,
        unit_rate: round2(fixed.unitRate),
      })
      linkedEntryIds.push(...fixed.entryIds)
    }
  }
  for (const line of hourlyLines) {
    const quantity = decimalHours(line.minutes)
    if (quantity <= 0) continue
    items.push({
      description: line.description,
      quantity,
      unit_rate: round2(line.rate),
    })
    linkedEntryIds.push(...line.entryIds)
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

  const submissionKey = text(formData, 'submission_key')

  const subtotal = round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unit_rate), 0))
  const taxAmount = taxTotal(subtotal, taxes)
  const total = round2(subtotal + taxAmount)

  // Claimed only once every check has passed, so a validation error never
  // burns the key — the form stays usable for a corrected resubmit.
  //
  // Time lines were already self-protecting (an entry with an invoice_id is
  // skipped above), but manual lines were not: a resubmit used to mint a second
  // invoice containing them, or — with none — report the baffling "Add at
  // least one line" on a form the user clearly filled in.
  const claim = await claimFormSubmission(supabase, userId, submissionKey)
  if (claim.kind === 'in_progress') {
    return { error: 'That invoice is still being saved — give it a moment, then reload.' }
  }
  // A replay redirects to the invoice the first attempt created, so the person
  // lands where they expected instead of being told off for clicking twice.
  if (claim.kind === 'replay') {
    const replayed = claim.response as { invoiceId?: string }
    if (replayed?.invoiceId) {
      revalidatePath('/invoices')
      revalidatePath('/time')
      revalidatePath('/dashboard')
      redirect(`/invoices/${replayed.invoiceId}`)
    }
    return { error: 'That invoice was already created — reload the page to see it.' }
  }

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
        taxes,
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
      await releaseFormClaim(supabase, userId, submissionKey)
      return { error: 'Could not save the invoice — please try again.' }
    }
    invoiceId = invoice!.id
  }

  if (!invoiceId) {
    await releaseFormClaim(supabase, userId, submissionKey)
    return { error: 'Could not allocate an invoice number — please try again.' }
  }

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(items.map((item) => ({ ...item, invoice_id: invoiceId })))

  if (itemsError) {
    console.error('create invoice items failed:', itemsError.message)
    await supabase.from('invoices').delete().eq('id', invoiceId)
    await releaseFormClaim(supabase, userId, submissionKey)
    return { error: 'Could not save the invoice lines — please try again.' }
  }

  if (linkedEntryIds.length) {
    const { error: linkError } = await supabase
      .from('time_entries')
      .update({ invoice_id: invoiceId })
      .in('id', linkedEntryIds)
    if (linkError) console.error('link time entries failed:', linkError.message)
  }

  await storeFormResponse(supabase, userId, submissionKey, { invoiceId })

  revalidatePath('/invoices')
  revalidatePath('/time')
  revalidatePath('/dashboard')
  redirect(`/invoices/${invoiceId}`)
}

type EditLine = { description?: unknown; quantity?: unknown; unit_rate?: unknown }

// Correcting a draft. Line items are replaced wholesale rather than diffed:
// nothing references invoice_items rows, so the identity of a line carries no
// meaning, and comparing old to new would add failure modes for no gain.
export async function updateInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const clientId = text(formData, 'client_id')
  const projectId = text(formData, 'project_id')
  const issueDate = text(formData, 'issue_date')
  const dueDate = text(formData, 'due_date')
  const notes = optionalText(formData, 'notes')

  if (!isUuid(id)) return { error: 'That invoice could not be found.' }
  if (!isUuid(clientId)) return { error: 'Choose a client.' }
  if (!DATE_RE.test(issueDate)) return { error: 'Enter a valid issue date.' }
  if (dueDate && !DATE_RE.test(dueDate)) return { error: 'Enter a valid due date, or leave it blank.' }

  let parsed: unknown
  try {
    parsed = JSON.parse(text(formData, 'lines'))
  } catch {
    return { error: 'The invoice lines could not be read — reload the page and try again.' }
  }
  if (!Array.isArray(parsed)) {
    return { error: 'The invoice lines could not be read — reload the page and try again.' }
  }

  // Same manual-line validation as createInvoice, so the two paths agree on
  // what counts as a usable line.
  const items: { description: string; quantity: number; unit_rate: number }[] = []
  for (const entry of parsed) {
    const line = entry as EditLine
    const description = typeof line.description === 'string' ? line.description.trim().slice(0, 200) : ''
    const quantity = Number(line.quantity)
    const unitRate = Number(line.unit_rate)
    if (!description && !quantity) continue
    if (!Number.isFinite(quantity) || quantity < 0) return { error: 'A line has an invalid quantity.' }
    if (!Number.isFinite(unitRate) || unitRate < 0) return { error: 'A line has an invalid rate.' }
    if (quantity <= 0) continue
    items.push({ description: description || 'Item', quantity: round2(quantity), unit_rate: round2(unitRate) })
  }
  if (items.length === 0) return { error: 'Add at least one line with an amount before saving.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  // Draft-only: once sent, the client holds a copy and a public link, so
  // editing would silently rewrite what they were given. Void and reissue.
  const { data: current } = await supabase
    .from('invoices')
    .select('status, client_id, project_id, issue_date, due_date, notes, subtotal, tax_amount, total, taxes')
    .eq('id', id)
    .maybeSingle()
  if (!current) return { error: 'That invoice could not be found.' }
  if (current.status !== 'draft') {
    return { error: 'Only draft invoices can be edited. Void this one and raise a new invoice instead.' }
  }

  const { data: client } = await supabase.from('clients').select('id').eq('id', clientId).maybeSingle()
  if (!client) return { error: 'That client could not be found.' }

  // The invoice's own tax snapshot is reused, so correcting an amount never
  // silently applies a tax change the user has since made on their profile.
  const taxes = coerceTaxes(current.taxes)
  const subtotal = round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unit_rate), 0))
  const taxAmount = taxTotal(subtotal, taxes)
  const total = round2(subtotal + taxAmount)

  const { data: oldItemsData } = await supabase
    .from('invoice_items')
    .select('id, description, quantity, unit_rate')
    .eq('invoice_id', id)
  const oldItems = (oldItemsData ?? []) as {
    id: string
    description: string
    quantity: number | string
    unit_rate: number | string
  }[]

  // supabase-js has no transaction, so capture the old state and undo by hand.
  // Restoring the lines with fresh ids is equivalent — nothing references them.
  async function rollback(insertedIds: string[], reason: string) {
    if (insertedIds.length) await supabase.from('invoice_items').delete().in('id', insertedIds)
    await supabase
      .from('invoices')
      .update({
        client_id: current!.client_id,
        project_id: current!.project_id,
        issue_date: current!.issue_date,
        due_date: current!.due_date,
        notes: current!.notes,
        subtotal: current!.subtotal,
        tax_amount: current!.tax_amount,
        total: current!.total,
      })
      .eq('id', id)
    if (oldItems.length) {
      await supabase.from('invoice_items').insert(
        oldItems.map((item) => ({
          invoice_id: id,
          description: item.description,
          quantity: Number(item.quantity),
          unit_rate: Number(item.unit_rate),
        })),
      )
    }
    console.error('update invoice lines failed:', reason)
  }

  const { error: headerError } = await supabase
    .from('invoices')
    .update({
      client_id: clientId,
      project_id: projectId && isUuid(projectId) ? projectId : null,
      issue_date: issueDate,
      due_date: dueDate || null,
      notes,
      subtotal,
      tax_amount: taxAmount,
      total,
    })
    .eq('id', id)

  if (headerError) {
    console.error('update invoice failed:', headerError.message)
    return { error: 'Could not save the invoice — please try again.' }
  }

  // Insert then delete, so a failure never leaves the invoice with no lines.
  const { data: inserted, error: insertError } = await supabase
    .from('invoice_items')
    .insert(items.map((item) => ({ ...item, invoice_id: id })))
    .select('id')

  // The insert's generated types narrow to `never` when an error is present, so
  // read the ids through one explicit helper rather than inline in each branch.
  const insertedIds = ((inserted ?? []) as { id: string }[]).map((row) => row.id)

  if (insertError) {
    await rollback(insertedIds, insertError.message)
    return { error: 'Could not save the invoice lines — please try again.' }
  }

  if (oldItems.length) {
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .in('id', oldItems.map((item) => item.id))
    if (deleteError) {
      await rollback(insertedIds, deleteError.message)
      return { error: 'Could not save the invoice lines — please try again.' }
    }
  }

  revalidatePath(`/invoices/${id}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  redirect(`/invoices/${id}`)
}

export async function sendInvoice(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  if (!isUuid(id)) return { error: 'That invoice could not be found.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  if (!emailConfigured()) {
    return { error: 'Email is not set up yet — add RESEND_API_KEY and EMAIL_FROM to enable sending.' }
  }

  const { data: row } = await supabase
    .from('invoices')
    .select('public_token, status')
    .eq('id', id)
    .maybeSingle()
  if (!row) return { error: 'That invoice could not be found.' }
  if (row.status === 'void') return { error: 'Voided invoices cannot be sent.' }

  const snapshot = await fetchInvoiceSnapshot(supabase, id, userId)
  if (!snapshot) return { error: 'That invoice could not be found.' }

  const to = snapshot.client?.email?.trim()
  if (!to || !isEmail(to)) {
    return { error: 'Add a valid email address to this client before sending.' }
  }

  const base = await siteUrl()
  const link = base ? `${base}/i/${row.public_token}` : null

  let pdfBase64: string
  try {
    const bytes = await buildInvoicePdf(snapshot)
    pdfBase64 = Buffer.from(bytes).toString('base64')
  } catch (error) {
    console.error('render invoice pdf failed:', error)
    return { error: 'Could not prepare the PDF — please try again.' }
  }

  const { subject, html, text: body } = renderInvoiceEmail(snapshot, link, true)
  const result = await sendEmail({
    to,
    subject,
    html,
    text: body,
    replyTo: snapshot.business.email ?? undefined,
    attachments: [{ filename: `${snapshot.number}.pdf`, content: pdfBase64 }],
  })
  if (!result.ok) return { error: result.error }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      sent_at: new Date().toISOString(),
      sent_to: to,
      ...(row.status === 'draft' ? { status: 'sent' as const } : {}),
    })
    .eq('id', id)
  if (updateError) console.error('record invoice send failed:', updateError.message)

  revalidatePath(`/invoices/${id}`)
  revalidatePath('/invoices')
  return { ok: `Invoice emailed to ${to}.` }
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

  // Remove Storage objects before the cascading delete drops their metadata rows.
  await removeAttachmentObjects(supabase, await attachmentPathsForParent(supabase, { invoice_id: id }))

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
  const submissionKey = text(formData, 'submission_key')

  if (!isUuid(invoiceId)) return { error: 'That invoice could not be found.' }
  if (!DATE_RE.test(paidAt)) return { error: 'Enter a valid payment date.' }

  const rawAmount = String(formData.get('amount') ?? '').replace(/[₱,\s]/g, '').replace(/^p/i, '')
  const amount = Number(rawAmount)
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter a payment amount greater than zero.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  // A resubmit (double-click, back button, network retry) carries the same key
  // and must not write a second row — the money would double-count.
  const claim = await claimFormSubmission(supabase, userId, submissionKey)
  if (claim.kind === 'replay') return claim.response as FormState
  if (claim.kind === 'in_progress') {
    return { error: 'That payment is still being saved — give it a moment, then reload.' }
  }

  const { data: invoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).maybeSingle()
  if (!invoice) {
    await releaseFormClaim(supabase, userId, submissionKey)
    return { error: 'That invoice could not be found.' }
  }
  if (invoice.status === 'void') {
    await releaseFormClaim(supabase, userId, submissionKey)
    return { error: 'You cannot record a payment against a void invoice.' }
  }

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
    // Hand the key back so the form can be corrected and tried again.
    await releaseFormClaim(supabase, userId, submissionKey)
    return { error: 'Could not record the payment — please try again.' }
  }

  const result: FormState = { ok: 'Payment recorded.' }
  await storeFormResponse(supabase, userId, submissionKey, result)

  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return result
}

export async function updatePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, 'id')
  const invoiceId = text(formData, 'invoice_id')
  const paidAt = text(formData, 'paid_at')
  const method = optionalText(formData, 'method')
  const note = optionalText(formData, 'note')
  const amount = money(formData, 'amount')

  if (!isUuid(id)) return { error: 'That payment could not be found.' }
  if (!DATE_RE.test(paidAt)) return { error: 'Enter a valid payment date.' }
  if (amount === null || amount <= 0) return { error: 'Enter a payment amount greater than zero.' }

  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (!userId) return { error: 'Your session expired — sign in again.' }

  if (isUuid(invoiceId)) {
    const { data: invoice } = await supabase.from('invoices').select('status').eq('id', invoiceId).maybeSingle()
    if (invoice?.status === 'void') return { error: 'You cannot change a payment on a void invoice.' }
  }

  // `.select()` so a missing row reports an error rather than a false success.
  const { data: updated, error } = await supabase
    .from('payments')
    .update({ amount: round2(amount), paid_at: paidAt, method, note })
    .eq('id', id)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('update payment failed:', error.message)
    return { error: 'Could not save the payment — please try again.' }
  }
  if (!updated) return { error: 'That payment could not be found.' }

  if (isUuid(invoiceId)) revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  return { ok: 'Payment updated.' }
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
