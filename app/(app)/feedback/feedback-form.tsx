'use client'

import { useActionState, useState } from 'react'
import { submitFeedback } from './actions'
import type { FormState } from '@/lib/validation'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'
import { alertError, btnSecondary, focus, input, label } from '@/lib/ui'

const MAX = 4000

// Mango CTA — same treatment as the sidebar's "Send feedback" button.
const btnMango = `inline-flex items-center justify-center gap-2 rounded-xl bg-[#F4B63F] px-5 py-2.5 text-sm font-semibold text-[#0E2F27] shadow-sm transition-colors hover:bg-[#e9a82a] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 ${focus}`

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
        <span className="inline-flex rounded-full bg-[#2E9E6B]/10 p-3.5">
          <LogoMark size={40} />
        </span>
        <h2 className={`${display.className} mt-5 text-2xl font-extrabold tracking-tight`}>
          Thanks — it&rsquo;s in.
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[#0E2F27]/65">
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
        <p className="mb-5 flex items-center gap-2 text-sm text-[#0E2F27]/60">
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0E2F27] text-[11px] font-bold text-white"
            aria-hidden="true"
          >
            {email.slice(0, 1).toUpperCase()}
          </span>
          Sending as <span className="font-semibold text-[#0E2F27]">{email}</span>
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
        <span className="text-[#0E2F27]/45">We read every message during the beta.</span>
        <span
          className={`tabular-nums font-medium ${
            remaining === 0
              ? 'text-red-600'
              : remaining <= 400
                ? 'text-amber-600'
                : 'text-[#0E2F27]/45'
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

      <div className="mt-6 flex justify-end border-t border-[#0E2F27]/10 pt-5">
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
