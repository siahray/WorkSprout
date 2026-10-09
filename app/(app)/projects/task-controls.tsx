'use client'

import { useActionState, useTransition } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { addTask, setTaskStatus } from './actions'
import { alertError, alertOk, btnSecondary, input } from '@/lib/ui'

export function AddTaskForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(addTask, {})

  return (
    <form action={formAction} aria-busy={pending} className="space-y-2">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="flex gap-2">
        <label htmlFor="task-title" className="sr-only">
          Task title
        </label>
        <input
          id="task-title"
          name="title"
          required
          placeholder="Add a task…"
          className={`${input} flex-1`}
        />
        <SubmitButton pendingText="Adding…" className={btnSecondary}>
          Add
        </SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}
    </form>
  )
}

export function TaskStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      aria-label="Task status"
      value={status}
      disabled={pending}
      onChange={(event) =>
        startTransition(async () => {
          await setTaskStatus(id, event.target.value)
        })
      }
      className={`rounded-xl border border-[#0E2F27]/20 bg-white px-3.5 py-1.5 text-xs text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B] w-[130px]`}
    >
      <option value="todo">To do</option>
      <option value="in_progress">In progress</option>
      <option value="done">Done</option>
    </select>
  )
}
