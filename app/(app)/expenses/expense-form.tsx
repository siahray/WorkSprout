'use client'

import { useEffect, useId } from 'react'
import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { createExpense, updateExpense } from './actions'
import { EXPENSE_CATEGORIES } from '@/lib/expenses'
import { nowDateInput } from '@/lib/format'
import { alertError, alertOk, btnAccent, btnSecondary, input } from '@/lib/ui'
import type { FormState } from '@/lib/validation'

// The values an existing expense prefills the form with. Amount is passed as
// stored (number or numeric string) and rendered with two decimals below.
export type ExpenseDefaults = {
  id: string
  description: string
  category: string
  amount: number | string
  spent_on: string
  note: string | null
  project_id: string | null
}

// Shared by the add and edit modals: same fields, same validation, only the
// server action and the default values differ.
export function ExpenseForm({
  projects,
  expense,
  onSuccess,
  onCancel,
}: {
  projects: { id: string; name: string }[]
  expense?: ExpenseDefaults
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [state, formAction, pending] = useActionState(expense ? updateExpense : createExpense, {} as FormState)
  const uid = useId()
  const fieldId = (name: string) => `${uid}-${name}`

  // Close the modal once the server confirms the write. Errors keep it open so
  // the message stays visible next to the fields.
  useEffect(() => {
    if (state.ok) onSuccess?.()
  }, [state, onSuccess])

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      {expense && <input type="hidden" name="id" value={expense.id} />}

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
        <Field label="What was it?" htmlFor={fieldId('description')}>
          <input
            id={fieldId('description')}
            name="description"
            required
            maxLength={200}
            placeholder="Design software subscription"
            defaultValue={expense?.description ?? ''}
            className={input}
          />
        </Field>
        <Field label="Amount (₱)" htmlFor={fieldId('amount')}>
          <input
            id={fieldId('amount')}
            name="amount"
            inputMode="decimal"
            required
            placeholder="0.00"
            defaultValue={expense ? Number(expense.amount).toFixed(2) : ''}
            className={input}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor={fieldId('spent_on')}>
          <input
            id={fieldId('spent_on')}
            name="spent_on"
            type="date"
            required
            defaultValue={expense?.spent_on ?? nowDateInput()}
            className={input}
          />
        </Field>
        <Field label="Category" htmlFor={fieldId('category')}>
          <select
            id={fieldId('category')}
            name="category"
            defaultValue={expense?.category ?? 'Software'}
            className={input}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Project"
          htmlFor={fieldId('project_id')}
          hint={projects.length === 0 ? 'Add a project to see project profit' : undefined}
        >
          <select
            id={fieldId('project_id')}
            name="project_id"
            defaultValue={expense?.project_id ?? ''}
            className={input}
          >
            <option value="">Overhead</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Note" htmlFor={fieldId('note')} hint="Optional — receipt reference or what it's for">
        <input
          id={fieldId('note')}
          name="note"
          maxLength={200}
          defaultValue={expense?.note ?? ''}
          className={input}
        />
      </Field>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      {onCancel ? (
        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <SubmitButton pendingText={expense ? 'Saving…' : 'Adding…'} className={btnAccent}>
            {expense ? 'Save changes' : 'Add expense'}
          </SubmitButton>
        </div>
      ) : (
        <SubmitButton pendingText={expense ? 'Saving…' : 'Adding…'} className={btnAccent}>
          {expense ? 'Save changes' : 'Add expense'}
        </SubmitButton>
      )}
    </form>
  )
}
