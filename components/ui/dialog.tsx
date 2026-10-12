'use client'

import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({
  open,
  onOpenChange,
  labelledBy,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  labelledBy?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault()
        onOpenChange(false)
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false)
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[#0E2F27]/10 bg-white p-0 text-[#0E2F27] shadow-[0_24px_50px_-12px_rgba(14,47,39,0.45)]"
    >
      {children}
    </dialog>
  )
}