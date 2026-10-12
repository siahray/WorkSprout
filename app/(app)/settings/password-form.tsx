'use client'

import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { changePassword } from './actions'
import { alertError, alertOk, input } from '@/lib/ui'

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {})

  return (
    <form action={action} aria-busy={pending} className="space-y-5">
      <Field label="Current password" htmlFor="current_password">
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className={input}
        />
      </Field>
      <Field label="New password" htmlFor="new_password" hint="At least 8 characters">
        <input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm_password">
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={input}
        />
      </Field>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      <SubmitButton pendingText="Updating…">Update password</SubmitButton>
    </form>
  )
}
