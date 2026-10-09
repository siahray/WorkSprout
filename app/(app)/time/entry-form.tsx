'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import type { FormState } from '@/lib/validation'
import type { ProjectOption } from './timer-controls'
import { alertError, alertOk, btnSecondary, card, focus, input } from '@/lib/ui'
import { nowDateInput } from '@/lib/format'

export type EntryDefaults = {
  id?: string
  task_id?: string | null
  date?: string
  start?: string
  end?: string
  note?: string | null
  billable?: boolean
}

export function TimeEntryForm({
  action,
  projects,
  defaults = {},
  submitLabel = 'Log time',
  cancelHref = '/time',
  bare = false,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  projects: ProjectOption[]
  defaults?: EntryDefaults
  submitLabel?: string
  cancelHref?: string
  bare?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const withTasks = projects.filter((p) => p.tasks.length > 0)

  return (
    <form action={formAction} aria-busy={pending} className={bare ? 'space-y-5' : `${card} space-y-5 p-6`}>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <Field label="Task" htmlFor="task_id">
        <select id="task_id" name="task_id" required defaultValue={defaults.task_id ?? ''} className={input}>
          <option value="" disabled>
            Choose a task…
          </option>
          {withTasks.map((p) => (
            <optgroup key={p.id} label={`${p.clientName ? `${p.clientName} · ` : ''}${p.name}`}>
              {p.tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Date" htmlFor="date">
          <input id="date" name="date" type="date" required defaultValue={defaults.date ?? nowDateInput()} className={input} />
        </Field>
        <Field label="Start" htmlFor="start">
          <input id="start" name="start" type="time" required defaultValue={defaults.start ?? '09:00'} className={input} />
        </Field>
        <Field label="End" htmlFor="end">
          <input id="end" name="end" type="time" required defaultValue={defaults.end ?? '10:00'} className={input} />
        </Field>
      </div>

      <Field label="Note" htmlFor="note" hint="Optional — what did you work on?">
        <textarea
          id="note"
          name="note"
          rows={2}
          defaultValue={defaults.note ?? ''}
          placeholder="Describe the work…"
          className={`${input} resize-y`}
        />
      </Field>

      <label className="flex items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="billable"
          defaultChecked={defaults.billable ?? true}
          className="h-4 w-4 rounded border-[#0E2F27]/30 text-[#2E9E6B] focus:ring-[#2E9E6B]"
        />
        <span className="font-medium">Billable</span>
        <span className="text-[#0E2F27]/55">— include this time when invoicing</span>
      </label>

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
