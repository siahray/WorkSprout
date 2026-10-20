'use client'

import { useActionState } from 'react'
import { sendInvite, type InviteState } from './actions'
import { display } from '@/lib/fonts'
import { btnPrimary, focus } from '@/lib/ui'

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvite, {})

  return (
    <form
      action={action}
      aria-busy={pending}
      className="h-full rounded-panel border border-line bg-panel p-6 shadow-overlay"
    >
      <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Invite a beta tester</h2>
      <p className="mt-1 text-sm text-ink-2">
        We&apos;ll email them a secure invite link to set their password and get started.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="invite-email" className="sr-only">
          Email address
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="tester@email.com"
          defaultValue={state.email}
          disabled={pending}
          className={`min-w-0 flex-1 rounded-control border border-line-strong bg-panel px-4 py-3 text-ink placeholder:text-ink-4 disabled:opacity-60 ${focus}`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`${btnPrimary} px-5 py-3 disabled:cursor-wait`}
        >
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-3 rounded-control bg-danger-wash px-3 py-2 text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 rounded-control bg-sprout/10 px-3 py-2 text-sm font-medium text-sprout-deep">
          {state.ok}
        </p>
      )}
    </form>
  )
}
