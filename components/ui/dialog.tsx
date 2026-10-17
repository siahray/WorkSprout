'use client'

import { useEffect, useRef, type ReactNode } from 'react'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
} as const

export function Dialog({
  open,
  onOpenChange,
  labelledBy,
  size = 'sm',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  labelledBy?: string
  size?: keyof typeof SIZES
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
      className={`m-auto w-[calc(100%-2rem)] ${SIZES[size]} max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-2xl border border-[#0E2F27]/10 bg-white p-0 text-[#0E2F27] shadow-[0_24px_50px_-12px_rgba(14,47,39,0.45)]`}
    >
      {children}
    </dialog>
  )
}