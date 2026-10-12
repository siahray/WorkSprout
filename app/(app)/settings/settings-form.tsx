'use client'

import { useActionState, useState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { coerceTaxes } from '@/lib/tax'
import { updateProfile } from './actions'
import { alertError, alertOk, btnSecondary, card, focus, input } from '@/lib/ui'

export type ProfileDefaults = {
  full_name?: string | null
  business_name?: string | null
  business_address?: string | null
  business_phone?: string | null
  taxes?: unknown
}

type TaxInput = { id: string; label: string; rate: string }

function toInputTaxes(value: unknown): TaxInput[] {
  return coerceTaxes(value).map((tax) => ({
    id: crypto.randomUUID(),
    label: tax.label,
    rate: String(tax.rate),
  }))
}

// Common Philippine taxes, offered as one-click presets. Users can still add a
// custom tax with the "Add tax" button.
const PRESETS: { label: string; rate: number }[] = [
  { label: 'VAT', rate: 12 },
  { label: 'Percentage tax', rate: 3 },
  { label: 'Withholding tax', rate: 5 },
  { label: 'Service fee', rate: 10 },
]

export function SettingsForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, formAction, pending] = useActionState(updateProfile, {})
  const [taxes, setTaxes] = useState<TaxInput[]>(() => toInputTaxes(defaults.taxes))

  const taxesPayload = taxes
    .filter((tax) => tax.label.trim() !== '')
    .map((tax) => ({ label: tax.label.trim(), rate: Number(tax.rate) || 0 }))

  function addTax() {
    setTaxes((rows) => [...rows, { id: crypto.randomUUID(), label: '', rate: '' }])
  }

  function updateTax(id: string, patch: Partial<TaxInput>) {
    setTaxes((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  function removeTax(id: string) {
    setTaxes((rows) => rows.filter((row) => row.id !== id))
  }

  function addPreset(preset: { label: string; rate: number }) {
    setTaxes((rows) => {
      if (rows.some((row) => row.label.trim().toLowerCase() === preset.label.toLowerCase())) return rows
      return [...rows, { id: crypto.randomUUID(), label: preset.label, rate: String(preset.rate) }]
    })
  }

  return (
    <form action={formAction} aria-busy={pending} className="space-y-6">
      <section className={`${card} space-y-5 p-6`}>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Your details</h2>
          <p className="mt-1 text-sm text-[#0E2F27]/65">Shown on the invoices you send.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="full_name">
            <input id="full_name" name="full_name" defaultValue={defaults.full_name ?? ''} placeholder="Juan Dela Cruz" className={input} />
          </Field>
          <Field label="Business name" htmlFor="business_name" hint="Leave blank to use your name">
            <input id="business_name" name="business_name" defaultValue={defaults.business_name ?? ''} placeholder="Studio Verde" className={input} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business phone" htmlFor="business_phone">
            <input id="business_phone" name="business_phone" defaultValue={defaults.business_phone ?? ''} placeholder="+63 917 000 0000" className={input} />
          </Field>
          <Field label="Address" htmlFor="business_address">
            <textarea id="business_address" name="business_address" rows={2} defaultValue={defaults.business_address ?? ''} placeholder="Street, city, postal code" className={`${input} resize-y`} />
          </Field>
        </div>
      </section>

      <section className={`${card} space-y-5 p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Taxes</h2>
            <p className="mt-1 text-sm text-[#0E2F27]/65">
              Add each tax you charge — VAT, percentage tax, a service fee. They are applied to new
              invoices and snapshotted at creation, so past invoices never change.
            </p>
          </div>
          <button type="button" onClick={addTax} className={`${btnSecondary} shrink-0`}>
            Add tax
          </button>
        </div>

        <input type="hidden" name="taxes" value={JSON.stringify(taxesPayload)} />

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => addPreset(preset)}
              className={`rounded-full border border-[#0E2F27]/15 bg-white px-3 py-1 text-xs font-semibold text-[#0E2F27]/70 transition-colors hover:border-[#2E9E6B]/40 hover:text-[#1F6B52] ${focus}`}
            >
              {preset.label} · {preset.rate}%
            </button>
          ))}
        </div>

        {taxes.length === 0 ? (
          <p className="text-sm text-[#0E2F27]/55">
            No taxes yet. Add one if you charge VAT or a service fee.
          </p>
        ) : (
          <div className="space-y-3">
            {taxes.map((tax) => (
              <div key={tax.id} className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Tax label</span>
                  <input
                    value={tax.label}
                    onChange={(event) => updateTax(tax.id, { label: event.target.value })}
                    placeholder="VAT"
                    className={input}
                  />
                </label>
                <label className="w-28">
                  <span className="sr-only">Rate (%)</span>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={tax.rate}
                      onChange={(event) => updateTax(tax.id, { rate: event.target.value })}
                      placeholder="12"
                      className={`${input} pr-7`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#0E2F27]/45">
                      %
                    </span>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => removeTax(tax.id)}
                  className={`${btnSecondary} !px-3 !py-2 text-sm`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
    </form>
  )
}
