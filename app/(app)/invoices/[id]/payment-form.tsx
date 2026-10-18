'use client'

import { useEffect, useId } from 'react'
import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { addPayment, updatePayment } from '../actions'
import { alertError, alertOk, btnAccent, btnSecondary, input } from '@/lib/ui'
import { nowDateInput } from '@/lib/format'
import { useSubmissionKey } from '@/lib/use-submission-key'
import type { FormState } from '@/lib/validation'

// The stored values an existing payment prefills the form with. `paid_at` is a
// date column, so it already arrives as YYYY-MM-DD for <input type="date">.
export type PaymentDefaults = {
  id: string
  amount: number | string
  paid_at: string
  method: string | null
  note: string | null
}

// Backs both flows: record a payment, and correct one that was recorded wrong.
export function PaymentForm({
  invoiceId,
  balance,
  payment,
  onSuccess,
  onCancel,
}: {
  invoiceId: string
  balance?: number
  payment?: PaymentDefaults
  onSuccess?: () => void
  onCancel?: () => void
}) {
  const [state, formAction, pending] = useActionState(payment ? updatePayment : addPayment, {} as FormState)
  const uid = useId()
  const fieldId = (name: string) => `${uid}-${name}`

  // Only the create path needs it — updating a payment is idempotent by
  // nature, since every attempt writes the same row.
  const submissionKey = useSubmissionKey(Boolean(state.ok))

  useEffect(() => {
    if (state.ok) onSuccess?.()
  }, [state, onSuccess])

  const defaultAmount = payment
    ? Number(payment.amount).toFixed(2)
    : balance && balance > 0
      ? balance.toFixed(2)
      : ''

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      {payment && <input type="hidden" name="id" value={payment.id} />}
      <input type="hidden" name="submission_key" value={submissionKey} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount received (₱)" htmlFor={fieldId('amount')}>
          <input
            id={fieldId('amount')}
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={defaultAmount}
            placeholder="0.00"
            className={input}
          />
        </Field>
        <Field label="Date received" htmlFor={fieldId('paid_at')}>
          <input
            id={fieldId('paid_at')}
            name="paid_at"
            type="date"
            required
            defaultValue={payment?.paid_at ?? nowDateInput()}
            className={input}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Method" htmlFor={fieldId('method')} hint="e.g. GCash, bank transfer">
          <input
            id={fieldId('method')}
            name="method"
            placeholder="Bank transfer"
            defaultValue={payment?.method ?? ''}
            className={input}
          />
        </Field>
        <Field label="Reference / note" htmlFor={fieldId('note')} hint="Optional">
          <input
            id={fieldId('note')}
            name="note"
            placeholder="Ref no. 12345"
            defaultValue={payment?.note ?? ''}
            className={input}
          />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      {onCancel ? (
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Cancel
          </button>
          <SubmitButton pendingText="Saving…" className={btnAccent}>
            Save changes
          </SubmitButton>
        </div>
      ) : (
        <SubmitButton pendingText="Recording…" className={btnAccent}>
          Record payment
        </SubmitButton>
      )}
    </form>
  )
}
