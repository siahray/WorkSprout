'use client'

import { useActionState } from 'react'
import { sendBroadcast } from '@/app/admin/admin-actions'
import { display } from '@/lib/fonts'
import { alertError, alertOk, btnPrimary, input, label } from '@/lib/ui'

export function BroadcastForm({
  counts,
}: {
  counts: { signups: number; invited: number; users: number }
}) {
  const [state, action, pending] = useActionState(sendBroadcast, {})

  return (
    <form
      action={action}
      aria-busy={pending}
      className="rounded-control border border-line bg-panel p-5"
    >
      <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Compose broadcast</h2>
      <p className="mt-1 text-sm text-ink-2">
        Delivered one email per recipient through your configured sender.
      </p>

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="subject" className={label}>
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            required
            maxLength={200}
            disabled={pending}
            className={`mt-1.5 ${input}`}
            placeholder="An update from WorkSprout"
          />
        </div>

        <div>
          <label htmlFor="audience" className={label}>
            Audience
          </label>
          <select
            id="audience"
            name="audience"
            defaultValue="signups"
            disabled={pending}
            className={`mt-1.5 ${input}`}
          >
            <option value="signups">All beta signups ({counts.signups})</option>
            <option value="invited">Invited signups ({counts.invited})</option>
            <option value="users">Registered users ({counts.users})</option>
          </select>
        </div>

        <div>
          <label htmlFor="body" className={label}>
            Message
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={8}
            disabled={pending}
            className={`mt-1.5 ${input}`}
            placeholder="Write your announcement…"
          />
        </div>
      </div>

      {state.error && (
        <p role="alert" className={`mt-4 ${alertError}`}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={`mt-4 ${alertOk}`}>{state.ok}</p>}

      <div className="mt-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Sending…' : 'Send broadcast'}
        </button>
      </div>
    </form>
  )
}
