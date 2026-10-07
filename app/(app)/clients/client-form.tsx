'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import type { FormState } from '@/lib/validation'
import { alertError, alertOk, btnSecondary, card, focus, input } from '@/lib/ui'

export type ClientDefaults = {
  id?: string
  name?: string | null
  company?: string | null
  email?: string | null
  address?: string | null
  tax_id?: string | null
  notes?: string | null
}

export function ClientForm({
  action,
  defaults = {},
  submitLabel = 'Save client',
  cancelHref = '/clients',
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  defaults?: ClientDefaults
  submitLabel?: string
  cancelHref?: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} aria-busy={pending} className={`${card} space-y-5 p-6`}>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Client name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name ?? ''}
            placeholder="Acme Studio"
            className={input}
          />
        </Field>
        <Field label="Company" htmlFor="company" hint="Optional">
          <input
            id="company"
            name="company"
            defaultValue={defaults.company ?? ''}
            placeholder="Acme, Inc."
            className={input}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" htmlFor="email" hint="Used to address invoices to them">
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults.email ?? ''}
            placeholder="billing@acme.com"
            className={input}
          />
        </Field>
        <Field label="Tax ID / TIN" htmlFor="tax_id" hint="Optional, shown on invoices">
          <input
            id="tax_id"
            name="tax_id"
            defaultValue={defaults.tax_id ?? ''}
            placeholder="000-000-000-000"
            className={input}
          />
        </Field>
      </div>

      <Field label="Address" htmlFor="address" hint="Optional, shown on invoices">
        <textarea
          id="address"
          name="address"
          rows={2}
          defaultValue={defaults.address ?? ''}
          placeholder="Street, city, postal code"
          className={`${input} resize-y`}
        />
      </Field>

      <Field label="Notes" htmlFor="notes" hint="Private — never shown to the client">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaults.notes ?? ''}
          placeholder="Anything worth remembering about this client"
          className={`${input} resize-y`}
        />
      </Field>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <SubmitButton>{submitLabel}</SubmitButton>
        <Link href={cancelHref} className={`${btnSecondary} ${focus}`}>
          Cancel
        </Link>
      </div>
    </form>
  )
}
