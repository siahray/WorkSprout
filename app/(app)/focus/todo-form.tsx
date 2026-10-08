'use client'

import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import type { FormState } from '@/lib/validation'
import { alertError, alertOk, input } from '@/lib/ui'

export function TodoForm({
  action,
  projects,
  defaultDate,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  projects: { id: string; name: string }[]
  defaultDate: string
}) {
  const [state, formAction, pending] = useActionState(action, {})

  // The parent keys this component by day + list length, so the inputs reset
  // when you switch days or after a to-do is added.
  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="title"
          defaultValue=""
          maxLength={200}
          required
          placeholder="Add a to-do…"
          aria-label="To-do title"
          className={`${input} min-w-0 flex-1`}
        />
        <input
          type="date"
          name="due_date"
          defaultValue={defaultDate}
          aria-label="Due date"
          className={`${input} w-auto`}
        />
        <SubmitButton pendingText="Adding…">Add</SubmitButton>
      </div>

      {projects.length > 0 && (
        <Field label="Project (optional)" htmlFor="todo_project_id">
          <select id="todo_project_id" name="project_id" defaultValue="" className={input}>
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}
    </form>
  )
}