'use client'

import { useActionState } from 'react'
import { deleteFeedback, updateFeedbackStatus } from '@/app/admin/admin-actions'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { btnDanger, btnGhost, btnSecondary } from '@/lib/ui'

export function FeedbackActions({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(updateFeedbackStatus, {})

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form action={action} className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        {status === 'new' && (
          <button
            type="submit"
            name="status"
            value="read"
            disabled={pending}
            className={`${btnGhost} px-2 py-1 text-xs`}
          >
            Mark read
          </button>
        )}
        {status !== 'resolved' ? (
          <button
            type="submit"
            name="status"
            value="resolved"
            disabled={pending}
            className={`${btnSecondary} px-2.5 py-1.5 text-xs`}
          >
            Resolve
          </button>
        ) : (
          <button
            type="submit"
            name="status"
            value="new"
            disabled={pending}
            className={`${btnGhost} px-2 py-1 text-xs`}
          >
            Reopen
          </button>
        )}
      </form>

      <ConfirmAction
        action={deleteFeedback}
        id={id}
        message="Delete this feedback? This cannot be undone."
        className={`${btnDanger} px-2 py-1 text-xs`}
      >
        Delete
      </ConfirmAction>

      {state.error && (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      )}
    </div>
  )
}
