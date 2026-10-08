'use client'

import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { updateProfile } from './actions'
import { alertError, alertOk, card, input } from '@/lib/ui'

export type ProfileDefaults = {
  full_name?: string | null
  business_name?: string | null
  business_address?: string | null
  business_phone?: string | null
  tax_rate?: number | string | null
  tax_label?: string | null
}

export function SettingsForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, formAction, pending] = useActionState(updateProfile, {})

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
        <div>
          <h2 className="text-lg font-bold tracking-tight">Tax</h2>
          <p className="mt-1 text-sm text-[#0E2F27]/65">
            Applied to new invoices and snapshotted at creation, so past invoices never change.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tax label" htmlFor="tax_label" hint="e.g. VAT, Percentage tax, Service fee">
            <input id="tax_label" name="tax_label" defaultValue={defaults.tax_label ?? 'VAT'} placeholder="VAT" className={input} />
          </Field>
          <Field label="Tax rate (%)" htmlFor="tax_rate">
            <input
              id="tax_rate"
              name="tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={defaults.tax_rate != null ? String(defaults.tax_rate) : '0'}
              className={input}
            />
          </Field>
        </div>
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
