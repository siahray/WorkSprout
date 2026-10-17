'use client'

import { useCallback, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { PaymentForm, type PaymentDefaults } from './payment-form'
import { btnGhost } from '@/lib/ui'

// Correction path for a recorded payment. Date and method are the usual
// mistakes, and until now the only fix was delete-and-re-add.
export function PaymentEditDialog({
  invoiceId,
  payment,
}: {
  invoiceId: string
  payment: PaymentDefaults
}) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${btnGhost} !px-2.5 !py-1.5 text-xs`}>
        Edit
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Edit payment" size="md">
        {open && <PaymentForm invoiceId={invoiceId} payment={payment} onSuccess={close} onCancel={close} />}
      </Modal>
    </>
  )
}
