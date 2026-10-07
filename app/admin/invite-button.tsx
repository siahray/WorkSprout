'use client'

import { useActionState } from 'react'
import { sendInvite, type InviteState } from './actions'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export function InviteButton({ email, invited }: { email: string; invited: boolean }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvite, {})

  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="email" value={email} />
      <button
        type="submit"
        disabled={pending}
        className={`rounded-lg border border-[#0E2F27]/20 px-3 py-1.5 text-sm font-semibold text-[#0E2F27] transition-colors hover:border-[#0E2F27]/50 disabled:cursor-wait disabled:opacity-60 ${focus}`}
      >
        {pending ? 'Sending…' : invited ? 'Resend' : 'Send invite'}
      </button>
      {state.error && (
        <span role="alert" className="text-xs font-medium text-red-600">
          {state.error}
        </span>
      )}
      {state.ok && <span className="text-xs font-medium text-[#1F6B52]">Invite sent</span>}
    </form>
  )
}
