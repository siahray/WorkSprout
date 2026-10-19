'use client'

import { useActionState } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { addToToday } from './actions'

export function AddToTodayButton({
  title,
  projectId,
  dueDate,
}: {
  title: string
  projectId: string | null
  dueDate: string
}) {
  const [state, formAction] = useActionState(addToToday, {})

  return (
    <form action={formAction} className="inline-flex shrink-0 flex-col items-end gap-1">
      <input type="hidden" name="title" value={title} />
      {projectId && <input type="hidden" name="project_id" value={projectId} />}
      <input type="hidden" name="due_date" value={dueDate} />
      <SubmitButton
        pendingText="Adding…"
        className="rounded-control border border-line px-2.5 py-1 text-xs font-semibold text-sprout-deep transition-colors hover:bg-canvas focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sprout disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.ok ? 'Added ✓' : 'Add to today'}
      </SubmitButton>
      {state.error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {state.error}
        </span>
      )}
    </form>
  )
}
