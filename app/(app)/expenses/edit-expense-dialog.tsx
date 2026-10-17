'use client'

import { useCallback, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { ExpenseForm, type ExpenseDefaults } from './expense-form'
import { btnGhost } from '@/lib/ui'

// Row-level edit affordance. Like the add dialog, the form mounts only while
// open so every edit starts from the stored values with no leftover state.
export function EditExpenseDialog({
  expense,
  projects,
}: {
  expense: ExpenseDefaults
  projects: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} !px-2.5 !py-1.5 text-xs`}>
        Edit
      </button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Edit expense"
        description={expense.description}
        size="xl"
      >
        {open && <ExpenseForm expense={expense} projects={projects} onSuccess={close} onCancel={close} />}
      </Modal>
    </>
  )
}
