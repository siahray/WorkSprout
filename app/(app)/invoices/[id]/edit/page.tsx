import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/page-header'
import { InvoiceEditor } from './invoice-editor'
import { coerceTaxes } from '@/lib/tax'

export const metadata: Metadata = {
  title: 'Edit invoice · WorkSprout',
}

type ItemRow = { description: string; quantity: number | string; unit_rate: number | string }

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData?.claims) redirect('/login')

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, status, client_id, project_id, issue_date, due_date, notes, taxes')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) notFound()
  // Sent invoices are a record of what the client received, so the only way to
  // change one is to void it and raise a replacement.
  if (invoice.status !== 'draft') redirect(`/invoices/${id}`)

  const [clientsRes, projectsRes, itemsRes] = await Promise.all([
    supabase.from('clients').select('id, name').order('name', { ascending: true }),
    supabase.from('projects').select('id, name').order('name', { ascending: true }),
    supabase
      .from('invoice_items')
      .select('description, quantity, unit_rate')
      .eq('invoice_id', id)
      .order('created_at', { ascending: true }),
  ])

  const items = ((itemsRes.data ?? []) as ItemRow[]).map((item) => ({
    description: item.description,
    quantity: Number(item.quantity),
    unitRate: Number(item.unit_rate),
  }))

  return (
    <>
      <PageHeader title={`Edit ${invoice.number}`} description="Correct the details or the amounts on this draft." />
      <InvoiceEditor
        invoice={{
          id: invoice.id,
          number: invoice.number,
          clientId: invoice.client_id,
          projectId: invoice.project_id,
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date,
          notes: invoice.notes,
          taxes: coerceTaxes(invoice.taxes),
        }}
        clients={clientsRes.data ?? []}
        projects={projectsRes.data ?? []}
        items={items}
      />
    </>
  )
}
