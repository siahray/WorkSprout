'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { updateInvoice } from '../../actions'
import { taxLines, type Tax } from '@/lib/tax'
import { alertError, btnSecondary, card, focus, input } from '@/lib/ui'
import { formatPercent, peso } from '@/lib/format'
import { display } from '@/lib/fonts'
import type { FormState } from '@/lib/validation'

type Line = { id: string; description: string; quantity: string; unit_rate: string }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Edits a draft invoice: header details plus its line items. Tracked time
// linked to the invoice is deliberately untouched — releasing hours back to
// the unbilled pool is what voiding is for.
export function InvoiceEditor({
  invoice,
  clients,
  projects,
  items,
}: {
  invoice: {
    id: string
    number: string
    clientId: string
    projectId: string | null
    issueDate: string
    dueDate: string | null
    notes: string | null
    taxes: Tax[]
  }
  clients: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  items: { description: string; quantity: number; unitRate: number }[]
}) {
  const [state, formAction, pending] = useActionState(updateInvoice, {} as FormState)

  const [lines, setLines] = useState<Line[]>(() =>
    items.map((item) => ({
      id: crypto.randomUUID(),
      description: item.description,
      quantity: String(item.quantity),
      unit_rate: String(item.unitRate),
    })),
  )

  function updateLine(id: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function addLine() {
    setLines((prev) => [...prev, { id: crypto.randomUUID(), description: '', quantity: '1', unit_rate: '' }])
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((line) => line.id !== id))
  }

  const subtotal = round2(
    lines.reduce((sum, line) => {
      const quantity = Number(line.quantity)
      const rate = Number(line.unit_rate)
      if (!Number.isFinite(quantity) || !Number.isFinite(rate) || quantity <= 0) return sum
      return sum + round2(quantity * rate)
    }, 0),
  )
  const taxBreakdown = taxLines(subtotal, invoice.taxes)
  const taxAmount = round2(taxBreakdown.reduce((sum, line) => sum + line.amount, 0))
  const total = round2(subtotal + taxAmount)

  // The server re-validates everything; this is only so a blank or negative
  // row is never sent as if it were meaningful.
  const payload = JSON.stringify(
    lines
      .filter((line) => Number(line.quantity) > 0 && (line.description || Number(line.unit_rate)))
      .map((line) => ({
        description: line.description,
        quantity: Number(line.quantity),
        unit_rate: Number(line.unit_rate),
      })),
  )

  return (
    <form action={formAction} aria-busy={pending} className="space-y-6">
      <input type="hidden" name="id" value={invoice.id} />
      <input type="hidden" name="lines" value={payload} />

      <section className={`${card} space-y-5 p-6`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Client" htmlFor="client_id">
            <select id="client_id" name="client_id" required defaultValue={invoice.clientId} className={input}>
              <option value="" disabled>
                Choose a client…
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="project_id" hint="Optional">
            <select id="project_id" name="project_id" defaultValue={invoice.projectId ?? ''} className={input}>
              <option value="">None</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Issue date" htmlFor="issue_date">
            <input
              id="issue_date"
              name="issue_date"
              type="date"
              required
              defaultValue={invoice.issueDate}
              className={input}
            />
          </Field>
          <Field label="Due date" htmlFor="due_date" hint="Optional">
            <input id="due_date" name="due_date" type="date" defaultValue={invoice.dueDate ?? ''} className={input} />
          </Field>
        </div>
      </section>

      <section className={`${card} p-6`}>
        <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Line items</h2>
        <p className="mt-1 text-sm text-[#0E2F27]/65">
          Correct descriptions, hours or rates. Leaving a line out removes it.
        </p>

        <div className="mt-4 space-y-3">
          {lines.length === 0 && <p className="text-sm text-[#0E2F27]/65">No lines yet — add one below.</p>}
          {lines.map((line) => {
            const quantity = Number(line.quantity)
            const rate = Number(line.unit_rate)
            const amount = Number.isFinite(quantity) && Number.isFinite(rate) ? round2(quantity * rate) : 0
            return (
              <div key={line.id} className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Description</span>
                  <input
                    value={line.description}
                    onChange={(event) => updateLine(line.id, { description: event.target.value })}
                    placeholder="Description"
                    className={input}
                  />
                </label>
                <label className="w-20">
                  <span className="sr-only">Quantity</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.quantity}
                    onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                    placeholder="Qty"
                    className={input}
                  />
                </label>
                <label className="w-28">
                  <span className="sr-only">Rate</span>
                  <input
                    type="number"
                    step="0.01"
                    value={line.unit_rate}
                    onChange={(event) => updateLine(line.id, { unit_rate: event.target.value })}
                    placeholder="Rate"
                    className={input}
                  />
                </label>
                <span className="w-24 pb-3 text-right text-sm font-semibold tabular-nums">{peso(amount)}</span>
                <button
                  type="button"
                  onClick={() => removeLine(line.id)}
                  className={`${btnSecondary} !px-3 !py-2 text-sm`}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addLine} className={`${btnSecondary} mt-4`}>
          Add line
        </button>
      </section>

      <section className={`${card} space-y-5 p-6`}>
        <Field label="Notes" htmlFor="notes" hint="Optional — printed on the invoice">
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={invoice.notes ?? ''}
            placeholder="Payment terms, thank-you note…"
            className={`${input} resize-y`}
          />
        </Field>

        <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#0E2F27]/65">Subtotal</dt>
            <dd className="tabular-nums">{peso(subtotal)}</dd>
          </div>
          {taxBreakdown.map((tax) => (
            <div key={tax.label} className="flex justify-between">
              <dt className="text-[#0E2F27]/65">
                {tax.label} ({formatPercent(tax.rate)})
              </dt>
              <dd className="tabular-nums">{peso(tax.amount)}</dd>
            </div>
          ))}
          <div className="flex justify-between border-t border-[#0E2F27]/10 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className={`${display.className} tabular-nums`}>{peso(total)}</dd>
          </div>
        </dl>

        {state.error && (
          <p role="alert" className={alertError}>
            {state.error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="Saving…">Save changes</SubmitButton>
          <Link href={`/invoices/${invoice.id}`} className={`${btnSecondary} ${focus}`}>
            Cancel
          </Link>
        </div>
      </section>
    </form>
  )
}
