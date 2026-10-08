'use client'

import type { ReactNode } from 'react'
import { useActionState } from 'react'
import { SubmitButton } from './submit-button'
import type { FormState } from '@/lib/validation'

export function ActionButton({
  action,
  id,
  children,
  pendingText,
  className,
  errorClassName,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  id: string
  children: ReactNode
  pendingText?: string
  className?: string
  errorClassName?: string
}) {
  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingText={pendingText} className={className}>
        {children}
      </SubmitButton>
      {state.error && (
        <span role="alert" className={errorClassName ?? 'text-xs font-medium text-red-700'}>
          {state.error}
        </span>
      )}
    </form>
  )
}
