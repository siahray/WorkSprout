'use client'

import type { ReactNode } from 'react'
import { btnDanger } from '@/lib/ui'

export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: ReactNode
  message: string
  className?: string
}) {
  return (
    <button
      type="submit"
      className={className ?? btnDanger}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault()
      }}
    >
      {children}
    </button>
  )
}
