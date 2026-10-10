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
        className="rounded-lg border border-[#0E2F27]/15 px-2.5 py-1 text-xs font-semibold text-[#1F6B52] transition-colors hover:bg-[#F4F8F5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.ok ? 'Added ✓' : 'Add to today'}
      </SubmitButton>
      {state.error && (
        <span role="alert" className="text-xs font-medium text-red-700">
          {state.error}
        </span>
      )}
    </form>
  )
}
