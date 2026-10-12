'use client'

import { useActionState, useEffect, useRef } from 'react'
import { submitFeedback } from './actions'
import { alertError, alertOk, btnPrimary, input, label } from '@/lib/ui'

export function FeedbackForm({ page }: { page: string }) {
  const [state, action, pending] = useActionState(submitFeedback, {})
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  return (
    <form ref={formRef} action={action} aria-busy={pending}>
      <input type="hidden" name="page" value={page} />

      <label htmlFor="message" className={label}>
        Your message
      </label>
      <textarea
        id="message"
        name="message"
        required
        rows={8}
        maxLength={4000}
        disabled={pending}
        className={`mt-1.5 ${input}`}
        placeholder="Tell us what's working, what isn't, or what you'd love to see."
      />

      {state.error && (
        <p role="alert" className={`mt-3 ${alertError}`}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={`mt-3 ${alertOk}`}>{state.ok}</p>}

      <div className="mt-4">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Sending…' : 'Send feedback'}
        </button>
      </div>
    </form>
  )
}
