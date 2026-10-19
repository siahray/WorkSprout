'use client'

import { useId, type ReactNode } from 'react'
import { Dialog } from './dialog'
import { focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

// A titled dialog shell for forms and flows that outgrow a bare <dialog>.
// Built on Dialog so backdrop-dismiss, Esc-to-close, and focus trapping match
// the ConfirmAction dialogs used elsewhere in the app.
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: ReactNode
}) {
  const titleId = useId()

  return (
    <Dialog open={open} onOpenChange={onOpenChange} labelledBy={titleId} size={size}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <h2 id={titleId} className={`${display.className} text-lead font-extrabold tracking-tight text-ink`}>
            {title}
          </h2>
          {description && <p className="mt-1 text-small text-ink-2">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className={`-m-1.5 shrink-0 rounded-control p-1.5 text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink ${focus}`}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </Dialog>
  )
}
