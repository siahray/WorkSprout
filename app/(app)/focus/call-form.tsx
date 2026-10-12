'use client'

import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { createCall } from './actions'
import { alertError, alertOk, btnAccent, input } from '@/lib/ui'
import type { FormState } from '@/lib/validation'

const DURATIONS = [15, 30, 45, 60, 90, 120]

export function CallForm({
  clients,
  defaultDate,
}: {
  clients: { id: string; name: string }[]
  defaultDate: string
}) {
  const [state, formAction, pending] = useActionState(createCall, {} as FormState)

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      <Field label="Title" htmlFor="call_title">
        <input id="call_title" name="title" required maxLength={200} placeholder="Intro call" className={input} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="call_date">
          <input id="call_date" name="call_date" type="date" required defaultValue={defaultDate} className={input} />
        </Field>
        <Field label="Start time" htmlFor="call_time">
          <input id="call_time" name="call_time" type="time" required defaultValue="09:00" className={input} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duration" htmlFor="call_duration">
          <select id="call_duration" name="duration_minutes" defaultValue="30" className={input}>
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Client"
          htmlFor="call_client"
          hint={clients.length === 0 ? 'Add a client to invite them by email' : undefined}
        >
          <select id="call_client" name="client_id" defaultValue="" className={input}>
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Location or link" htmlFor="call_location" hint="Optional — a meeting URL or a place">
        <input id="call_location" name="location" placeholder="https://meet.google.com/…" className={input} />
      </Field>

      <Field label="Agenda / notes" htmlFor="call_notes" hint="Optional">
        <textarea id="call_notes" name="notes" rows={3} className={input} />
      </Field>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      <SubmitButton pendingText="Scheduling…" className={btnAccent}>
        Schedule call
      </SubmitButton>
    </form>
  )
}
