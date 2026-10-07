'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import type { FormState } from '@/lib/validation'
import { alertError, btnSecondary, card, focus, input } from '@/lib/ui'
import { decimalHours, formatPercent, nowDateInput, peso } from '@/lib/format'
import { display } from '@/lib/fonts'

export type UnbilledGroup = {
  key: string
  taskTitle: string
  projectId: string
  projectName: string
  clientId: string
  minutes: number
  rate: number | null
  entryIds: string[]
}

type ManualLine = { id: string; description: string; quantity: string; unit_rate: string }

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function InvoiceBuilder({
  action,
  clients,
  projects,
  unbilled,
  taxRate,
  taxLabel,
  initialClientId,
  initialProjectId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  clients: { id: string; name: string }[]
  projects: { id: string; name: string; client_id: string }[]
  unbilled: UnbilledGroup[]
  taxRate: number
  taxLabel: string
  initialClientId?: string
  initialProjectId?: string
}) {
  const [state, formAction] = useActionState(action, {})
  const [clientId, setClientId] = useState(initialClientId ?? clients[0]?.id ?? '')
  const [projectId, setProjectId] = useState(initialProjectId ?? '')
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(unbilled.map((g) => [g.key, g.clientId === (initialClientId ?? clients[0]?.id)]))
  )
  const [manual, setManual] = useState<ManualLine[]>([])

  const clientProjects = projects.filter((p) => p.client_id === clientId)

  const visibleGroups = unbilled.filter(
    (g) => g.clientId === clientId && (!projectId || g.projectId === projectId)
  )

  const timeLines = visibleGroups.filter((g) => selected[g.key])

  const timeSum = timeLines.reduce(
    (sum, g) => sum + round2(decimalHours(g.minutes) * (g.rate ?? 0)),
    0
  )
  const manualSum = manual.reduce((sum, line) => {
    const q = Number(line.quantity)
    const r = Number(line.unit_rate)
    if (!Number.isFinite(q) || !Number.isFinite(r) || q <= 0) return sum
    return sum + round2(q * r)
  }, 0)
  const subtotal = round2(timeSum + manualSum)

  const taxAmount = round2((subtotal * taxRate) / 100)
  const total = round2(subtotal + taxAmount)

  const payload = JSON.stringify([
    ...timeLines.map((g) => ({
      kind: 'time',
      description: `${g.projectName} · ${g.taskTitle}`,
      entry_ids: g.entryIds,
    })),
    ...manual
      .filter((line) => Number(line.quantity) > 0 && (line.description || Number(line.unit_rate)))
      .map((line) => ({
        kind: 'manual',
        description: line.description,
        quantity: Number(line.quantity),
        unit_rate: Number(line.unit_rate),
      })),
  ])

  function changeClient(id: string) {
    setClientId(id)
    setProjectId('')
    setSelected((prev) => {
      const next = { ...prev }
      for (const g of unbilled) next[g.key] = g.clientId === id
      return next
    })
  }

  function toggle(key: string) {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function addManual() {
    setManual((lines) => [
      ...lines,
      { id: crypto.randomUUID(), description: '', quantity: '1', unit_rate: '' },
    ])
  }

  function updateManual(id: string, patch: Partial<ManualLine>) {
    setManual((lines) => lines.map((line) => (line.id === id ? { ...line, ...patch } : line)))
  }

  function removeManual(id: string) {
    setManual((lines) => lines.filter((line) => line.id !== id))
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="lines" value={payload} />

      <section className={`${card} space-y-5 p-6`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Client" htmlFor="client_id">
            <select
              id="client_id"
              name="client_id"
              required
              value={clientId}
              onChange={(event) => changeClient(event.target.value)}
              className={input}
            >
              <option value="" disabled>
                Choose a client…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project" htmlFor="project_id" hint="Optional — filters unbilled time">
            <select
              id="project_id"
              name="project_id"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={input}
            >
              <option value="">All projects</option>
              {clientProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Issue date" htmlFor="issue_date">
            <input id="issue_date" name="issue_date" type="date" required defaultValue={nowDateInput()} className={input} />
          </Field>
          <Field label="Due date" htmlFor="due_date" hint="Optional">
            <input id="due_date" name="due_date" type="date" className={input} />
          </Field>
          <Field label={`${taxLabel} rate`} htmlFor="tax_display">
            <input id="tax_display" value={formatPercent(taxRate)} readOnly disabled className={input} />
          </Field>
        </div>
      </section>

      <section className={`${card} p-6`}>
        <div className="flex items-center justify-between">
          <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Unbilled time</h2>
          <span className="text-sm text-[#0E2F27]/55">{timeLines.length} of {visibleGroups.length} selected</span>
        </div>

        {visibleGroups.length === 0 ? (
          <p className="mt-3 text-sm text-[#0E2F27]/65">
            No unbilled billable time for this {projectId ? 'project' : 'client'}. Track time first, or add a manual line below.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-[#0E2F27]/10">
            {visibleGroups.map((g) => (
              <label key={g.key} className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  checked={Boolean(selected[g.key])}
                  onChange={() => toggle(g.key)}
                  className="h-4 w-4 rounded border-[#0E2F27]/30 text-[#2E9E6B] focus:ring-[#2E9E6B]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{g.taskTitle}</span>
                  <span className="block text-xs text-[#0E2F27]/55">{g.projectName}</span>
                </span>
                <span className="text-right text-sm tabular-nums text-[#0E2F27]/75">
                  {decimalHours(g.minutes).toFixed(2)} h
                  <span className="block text-xs text-[#0E2F27]/55">
                    {g.rate != null ? `${peso(g.rate)}/hr` : 'No rate'}
                  </span>
                </span>
                <span className="w-24 text-right text-sm font-semibold tabular-nums">
                  {peso(decimalHours(g.minutes) * (g.rate ?? 0))}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      <section className={`${card} p-6`}>
        <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Other items</h2>
        <p className="mt-1 text-sm text-[#0E2F27]/65">Add fixed fees, expenses, or discounts (use a negative rate to subtract).</p>

        <div className="mt-4 space-y-3">
          {manual.map((line) => {
            const q = Number(line.quantity)
            const r = Number(line.unit_rate)
            const amount = Number.isFinite(q) && Number.isFinite(r) ? round2(q * r) : 0
            return (
              <div key={line.id} className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Description</span>
                  <input
                    value={line.description}
                    onChange={(event) => updateManual(line.id, { description: event.target.value })}
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
                    onChange={(event) => updateManual(line.id, { quantity: event.target.value })}
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
                    onChange={(event) => updateManual(line.id, { unit_rate: event.target.value })}
                    placeholder="Rate"
                    className={input}
                  />
                </label>
                <span className="w-24 pb-3 text-right text-sm font-semibold tabular-nums">{peso(amount)}</span>
                <button
                  type="button"
                  onClick={() => removeManual(line.id)}
                  className={`${btnSecondary} !px-3 !py-2 text-sm`}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>

        <button type="button" onClick={addManual} className={`${btnSecondary} mt-4`}>
          Add line
        </button>
      </section>

      <section className={`${card} space-y-5 p-6`}>
        <Field label="Notes" htmlFor="notes" hint="Optional — printed on the invoice">
          <textarea id="notes" name="notes" rows={2} placeholder="Payment terms, thank-you note…" className={`${input} resize-y`} />
        </Field>

        <dl className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#0E2F27]/65">Subtotal</dt>
            <dd className="tabular-nums">{peso(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#0E2F27]/65">
              {taxLabel} ({formatPercent(taxRate)})
            </dt>
            <dd className="tabular-nums">{peso(taxAmount)}</dd>
          </div>
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
          <SubmitButton pendingText="Creating…">Create invoice</SubmitButton>
          <Link href="/invoices" className={`${btnSecondary} ${focus}`}>
            Cancel
          </Link>
        </div>
      </section>
    </form>
  )
}
