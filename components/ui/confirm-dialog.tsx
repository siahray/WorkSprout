'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Dialog } from './dialog'
import { btnDanger, btnSecondary } from '@/lib/ui'

export function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  message,
  confirmLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message: string
  confirmLabel: ReactNode
  onConfirm?: () => void
}) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange} labelledBy={titleId}>
      <div className="flex flex-col items-center gap-4 p-6">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <div className="text-center">
          <h2 id={titleId} className="text-base font-semibold text-[#0E2F27]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[#0E2F27]/60">{message}</p>
        </div>
        <div className="mt-1 flex w-full gap-3">
          <button ref={cancelRef} type="button" className={`${btnSecondary} flex-1`} onClick={() => onOpenChange(false)}>
            Cancel
          </button>
          <button type="submit" className={`${btnDanger} flex-1`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  )
}