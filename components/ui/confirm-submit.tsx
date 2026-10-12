'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { ConfirmDialog } from './confirm-dialog'
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
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className={className ?? btnDanger} onClick={() => setOpen(true)}>
        {children}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        message={message}
        confirmLabel={children}
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}