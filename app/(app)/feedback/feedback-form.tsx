'use client'

import { useActionState, useState } from 'react'
import { submitFeedback } from './actions'
import type { FormState } from '@/lib/validation'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'
import { alertError, btnMango, btnSecondary, input, label } from '@/lib/ui'

const MAX = 4000

export function FeedbackForm({ page, email }: { page: string; email?: string }) {
  const [state, action, pending] = useActionState(submitFeedback, {})
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [handled, setHandled] = useState<FormState | null>(null)

  // Each submit returns a fresh state object; on success flip to the
  // thank-you panel and clear the draft. Render-phase adjustment (React
  // docs: "you might not need an effect") — guarded so it runs once per
  // submit and never re-triggers after "Write another".
  if (state.ok && state !== handled) {
    setHandled(state)
    setMessage('')
    setDone(true)
  }

  if (done) {
    return (
      <div className="px-2 py-10 text-center">
        <span className="inline-flex rounded-full bg-sprout/10 p-3.5">
          <LogoMark size={40} />
        </span>
        <h2 className={`${display.className} mt-5 text-2xl font-extrabold tracking-tight`}>
          Thanks — it&rsquo;s in.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-ink-2">
          We read every message during the beta. If we need more detail about this one, we&rsquo;ll email you.
        </p>
        <button type="button" onClick={() => setDone(false)} className={`mt-6 ${btnSecondary}`}>
          Write another
        </button>
      </div>
    )
  }

  const remaining = MAX - message.length

  return (
    <form action={action} aria-busy={pending}>
      <input type="hidden" name="page" value={page} />

      {email && (
        <p className="mb-5 flex items-center gap-2 text-sm text-ink-2">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-meta font-bold text-white"
            aria-hidden="true"
          >
            {email.slice(0, 1).toUpperCase()}
          </span>
          Sending as <span className="font-semibold text-ink">{email}</span>
        </p>
      )}

      <label htmlFor="message" className={label}>
        Your message
      </label>
      <textarea
        id="message"
        name="message"
        required
        rows={8}
        maxLength={MAX}
        disabled={pending}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className={`mt-1.5 ${input}`}
        placeholder="Tell us what's working, what isn't, or what you'd love to see."
      />

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-ink-3">We read every message during the beta.</span>
        <span
          className={`tabular-nums font-medium ${
            remaining === 0
              ? 'text-danger'
              : remaining <= 400
                ? 'text-amber-600'
                : 'text-ink-3'
          }`}
        >
          {message.length} / {MAX}
        </span>
      </div>

      {state.error && (
        <p role="alert" className={`mt-3 ${alertError}`}>
          {state.error}
        </p>
      )}

      <div className="mt-6 flex justify-end border-t border-line pt-5">
        <button
          type="submit"
          disabled={pending || message.trim().length === 0}
          className={btnMango}
        >
          {pending ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </form>
  )
}
