// A single, presentation-ready view of an invoice, shared by the PDF renderer,
// the email template, and the public page. Built either from the owner's RLS
// session or from the anonymous `invoice_public` RPC.

import type { SupabaseClient } from '@supabase/supabase-js'
import { coerceTaxes, type Tax } from '@/lib/tax'

export type InvoiceItem = {
  description: string
  quantity: number
  unitRate: number
  amount: number
}

export type InvoiceParty = {
  name: string
  company: string | null
  address: string | null
  email: string | null
  taxId: string | null
}

export type InvoiceBusiness = {
  name: string
  legalName: string | null
  address: string | null
  phone: string | null
  email: string | null
}

export type InvoiceSnapshot = {
  number: string
  status: string
  baseStatus: string
  issueDate: string
  dueDate: string | null
  currency: string
  projectName: string | null
  notes: string | null
  taxes: Tax[]
  subtotal: number
  taxAmount: number
  total: number
  amountPaid: number
  balance: number
  sentAt: string | null
  items: InvoiceItem[]
  client: InvoiceParty | null
  business: InvoiceBusiness
}

function num(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

type SnapshotRow = {
  number: string
  status: string
  base_status: string
  issue_date: string
  due_date: string | null
  currency: string
  project_name: string | null
  notes: string | null
  taxes: unknown
  subtotal: unknown
  tax_amount: unknown
  total: unknown
  amount_paid: unknown
  balance: unknown
  sent_at: string | null
  client_id: string
}

// Loads an invoice the caller owns. RLS on every table keeps this scoped to the
// signed-in user.
export async function fetchInvoiceSnapshot(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<InvoiceSnapshot | null> {
  const { data: raw } = await db.from('invoice_balances').select('*').eq('id', id).maybeSingle()
  const row = raw as unknown as SnapshotRow | null
  if (!row) return null

  const [itemsRes, clientRes, profileRes] = await Promise.all([
    db
      .from('invoice_items')
      .select('description, quantity, unit_rate, amount')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true }),
    db
      .from('clients')
      .select('name, company, email, address, tax_id')
      .eq('id', row.client_id)
      .maybeSingle(),
    db
      .from('profiles')
      .select('business_name, full_name, business_address, business_phone, email')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const client = clientRes.data
  const profile = profileRes.data

  return {
    number: row.number,
    status: row.status,
    baseStatus: row.base_status,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    currency: row.currency || 'PHP',
    projectName: row.project_name,
    notes: row.notes,
    taxes: coerceTaxes(row.taxes),
    subtotal: num(row.subtotal),
    taxAmount: num(row.tax_amount),
    total: num(row.total),
    amountPaid: num(row.amount_paid),
    balance: num(row.balance),
    sentAt: row.sent_at,
    items: (itemsRes.data ?? []).map((item) => ({
      description: item.description as string,
      quantity: num(item.quantity),
      unitRate: num(item.unit_rate),
      amount: num(item.amount),
    })),
    client: client
      ? {
          name: client.name as string,
          company: str(client.company),
          address: str(client.address),
          email: str(client.email),
          taxId: str(client.tax_id),
        }
      : null,
    business: {
      name: str(profile?.business_name) ?? str(profile?.full_name) ?? 'Your business',
      legalName: str(profile?.full_name),
      address: str(profile?.business_address),
      phone: str(profile?.business_phone),
      email: str(profile?.email),
    },
  }
}

type PublicPayload = {
  invoice: {
    number: string
    base_status: string
    issue_date: string
    due_date: string | null
    currency: string
    taxes: unknown
    subtotal: unknown
    tax_amount: unknown
    total: unknown
    notes: string | null
    project_name: string | null
    sent_at: string | null
  }
  items?: { description: string; quantity: unknown; unit_rate: unknown; amount: unknown }[]
  payments?: { amount: unknown }[]
  client: {
    name: string
    company: string | null
    address: string | null
    email: string | null
    tax_id: string | null
  }
  business: {
    business_name: string | null
    full_name: string | null
    business_address: string | null
    business_phone: string | null
    email: string | null
  }
}

// Maps the JSON returned by the `invoice_public` RPC into the shared shape.
export function snapshotFromPublic(payload: unknown): InvoiceSnapshot | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as PublicPayload
  if (!p.invoice || !p.business) return null

  const invoice = p.invoice
  const base = invoice.base_status as string
  const total = num(invoice.total)
  const amountPaid = (p.payments ?? []).reduce((sum, payment) => sum + num(payment.amount), 0)
  // The RPC only returns the base status, so the public view derives the
  // payment state here: paid = fully settled, partial = some payment, else sent.
  // Draft and void are terminal and never re-derived.
  const status =
    base === 'void' || base === 'draft'
      ? base
      : amountPaid >= total && total > 0
        ? 'paid'
        : amountPaid > 0
          ? 'partial'
          : 'sent'

  return {
    number: invoice.number,
    status,
    baseStatus: base,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    currency: invoice.currency || 'PHP',
    projectName: str(invoice.project_name),
    notes: str(invoice.notes),
    taxes: coerceTaxes(invoice.taxes),
    subtotal: num(invoice.subtotal),
    taxAmount: num(invoice.tax_amount),
    total,
    amountPaid,
    balance: Math.round((total - amountPaid) * 100) / 100,
    sentAt: str(invoice.sent_at),
    items: (p.items ?? []).map((item) => ({
      description: item.description as string,
      quantity: num(item.quantity),
      unitRate: num(item.unit_rate),
      amount: num(item.amount),
    })),
    client: p.client
      ? {
          name: p.client.name,
          company: str(p.client.company),
          address: str(p.client.address),
          email: str(p.client.email),
          taxId: str(p.client.tax_id),
        }
      : null,
    business: {
      name: str(p.business.business_name) ?? str(p.business.full_name) ?? 'Your business',
      legalName: str(p.business.full_name),
      address: str(p.business.business_address),
      phone: str(p.business.business_phone),
      email: str(p.business.email),
    },
  }
}
