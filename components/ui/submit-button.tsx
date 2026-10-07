'use client'

import type { ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import { btnPrimary } from '@/lib/ui'

export function SubmitButton({
  children,
  pendingText = 'Saving…',
  className,
}: {
  children: ReactNode
  pendingText?: string
  className?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" disabled={pending} className={className ?? btnPrimary}>
      {pending ? pendingText : children}
    </button>
  )
}
