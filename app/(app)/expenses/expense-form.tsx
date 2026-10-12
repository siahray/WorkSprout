'use client'

import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { createExpense } from './actions'
import { EXPENSE_CATEGORIES } from '@/lib/expenses'
import { nowDateInput } from '@/lib/format'
import { alertError, alertOk, btnAccent, input } from '@/lib/ui'
import type { FormState } from '@/lib/validation'

export function ExpenseForm({ projects }: { projects: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createExpense, {} as FormState)

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_150px]">
        <Field label="What was it?" htmlFor="expense_description">
          <input
            id="expense_description"
            name="description"
            required
            maxLength={200}
            placeholder="Design software subscription"
            className={input}
          />
        </Field>
        <Field label="Amount (₱)" htmlFor="expense_amount">
          <input
            id="expense_amount"
            name="amount"
            inputMode="decimal"
            required
            placeholder="0.00"
            className={input}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="expense_spent_on">
          <input
            id="expense_spent_on"
            name="spent_on"
            type="date"
            required
            defaultValue={nowDateInput()}
            className={input}
          />
        </Field>
        <Field label="Category" htmlFor="expense_category">
          <select id="expense_category" name="category" defaultValue="Software" className={input}>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Project"
          htmlFor="expense_project"
          hint={projects.length === 0 ? 'Add a project to see project profit' : undefined}
        >
          <select id="expense_project" name="project_id" defaultValue="" className={input}>
            <option value="">Overhead</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Note" htmlFor="expense_note" hint="Optional — receipt reference or what it's for">
        <input id="expense_note" name="note" maxLength={200} className={input} />
      </Field>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      <SubmitButton pendingText="Adding…" className={btnAccent}>
        Add expense
      </SubmitButton>
    </form>
  )
}