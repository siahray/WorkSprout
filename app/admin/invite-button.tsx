'use client'

import { useActionState } from 'react'
import { sendInvite, type InviteState } from './actions'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sprout'

export function InviteButton({ email, invited }: { email: string; invited: boolean }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvite, {})

  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-control border border-line-strong px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-4 disabled:cursor-wait disabled:opacity-60 ${focus}`}
      >
        {pending ? 'Sending…' : invited ? 'Resend' : 'Send invite'}
      </button>
      {state.error && (
        <span role="alert" className="text-xs font-medium text-danger">
          {state.error}
        </span>
      )}
      {state.ok && <span className="text-xs font-medium text-sprout-deep">Invite sent</span>}
    </form>
  )
}
