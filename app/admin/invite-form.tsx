'use client'

import { useActionState } from 'react'
import { sendInvite, type InviteState } from './actions'
import { display } from '@/lib/fonts'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(sendInvite, {})

  return (
    <form
      action={action}
      aria-busy={pending}
      className="rounded-xl border border-[#0E2F27]/12 bg-white p-5"
    >
      <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Invite a beta tester</h2>
      <p className="mt-1 text-sm text-[#0E2F27]/65">
        We email them a one-time code. They use it to create an account, then log in with a password.
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
          className={`min-w-0 flex-1 rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3 text-[#0E2F27] placeholder:text-[#0E2F27]/40 disabled:opacity-60 ${focus}`}
        />
        <button
          type="submit"
          disabled={pending}
          className={`rounded-xl bg-[#0E2F27] px-5 py-3 font-semibold text-white transition-colors hover:bg-[#1F6B52] disabled:cursor-wait disabled:opacity-60 ${focus}`}
        >
          {pending ? 'Sending…' : 'Send invite'}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 rounded-lg bg-[#2E9E6B]/10 px-3 py-2 text-sm font-medium text-[#1F6B52]">
          {state.ok}
        </p>
      )}
    </form>
  )
}
