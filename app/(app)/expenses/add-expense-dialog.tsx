'use client'

import { useCallback, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { ExpenseForm } from './expense-form'
import { btnPrimary, focus } from '@/lib/ui'

// "Add expense" as a popup modal. The form only mounts while the dialog is
// open, so every reopen starts with empty fields and no leftover error state.
export function AddExpenseDialog({
  projects,
  label = 'Add expense',
  className,
}: {
  projects: { id: string; name: string }[]
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? `${btnPrimary} ${focus}`}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        {label}
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Add expense"
        description="Link a project to track its real profit margin."
        size="xl"
      >
        {open && <ExpenseForm projects={projects} onSuccess={close} onCancel={close} />}
      </Modal>
    </>
  )
}
