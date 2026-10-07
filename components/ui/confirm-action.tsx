'use client'

import type { ReactNode } from 'react'
import { useActionState } from 'react'
import { ConfirmSubmit } from './confirm-submit'
import type { FormState } from '@/lib/validation'

export function ConfirmAction({
  action,
  id,
  message,
  children,
  className,
  errorClassName,
  extra,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  id: string
  message: string
  children: ReactNode
  className?: string
  errorClassName?: string
  extra?: Record<string, string>
}) {
  const [state, formAction] = useActionState(action, {})

  return (
    <form action={formAction} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      {extra &&
        Object.entries(extra).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}
      <ConfirmSubmit message={message} className={className}>
        {children}
      </ConfirmSubmit>
      {state.error && (
        <span role="alert" className={errorClassName ?? 'text-xs font-medium text-red-700'}>
          {state.error}
        </span>
      )}
    </form>
  )
}
