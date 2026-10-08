"use client"

import Link from 'next/link'
import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import type { FormState } from '@/lib/validation'
import { alertError, alertOk, btnSecondary, card, focus, input } from '@/lib/ui'

export type ProjectDefaults = {
  id?: string
  client_id?: string | null
  name?: string | null
  description?: string | null
  status?: string | null
  hourly_rate?: number | string | null
  fixed_rate?: number | string | null
}

export function ProjectForm({
  action,
  clients,
  defaults = {},
  submitLabel = 'Save project',
  cancelHref,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  clients: { id: string; name: string }[]
  defaults?: ProjectDefaults
  submitLabel?: string
  cancelHref: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} aria-busy={pending} className={`${card} space-y-5 p-6`}>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Project name" htmlFor="name">
          <input
            id="name"
            name="name"
            required
            defaultValue={defaults.name ?? ''}
            placeholder="Website redesign"
            className={input}
          />
        </Field>
        <Field label="Client" htmlFor="client_id">
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={defaults.client_id ?? ''}
            disabled={Boolean(defaults.id)}
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
      </div>

      <Field label="Description" htmlFor="description" hint="Optional">
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={defaults.description ?? ''}
          placeholder="What is this project about?"
          className={`${input} resize-y`}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Status" htmlFor="status">
          <select id="status" name="status" defaultValue={defaults.status ?? 'active'} className={input}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </Field>
        <Field label="Hourly rate (₱)" htmlFor="hourly_rate" hint="Optional">
          <input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults.hourly_rate != null ? String(defaults.hourly_rate) : ''}
            placeholder="0.00"
            className={input}
          />
        </Field>
        <Field label="Fixed amount (₱)" htmlFor="fixed_rate" hint="Optional">
          <input
            id="fixed_rate"
            name="fixed_rate"
            type="number"
            min="0"
            step="0.01"
            defaultValue={defaults.fixed_rate != null ? String(defaults.fixed_rate) : ''}
            placeholder="0.00"
            className={input}
          />
        </Field>
      </div>

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
