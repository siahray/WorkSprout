'use client'

import { useActionState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { addPayment } from '../actions'
import { alertError, alertOk, btnAccent, input } from '@/lib/ui'
import { nowDateInput } from '@/lib/format'

export function PaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const [state, formAction, pending] = useActionState(addPayment, {})

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      <input type="hidden" name="invoice_id" value={invoiceId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount received (₱)" htmlFor="amount">
          <input
            id="amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={balance > 0 ? balance.toFixed(2) : ''}
            placeholder="0.00"
            className={input}
          />
        </Field>
        <Field label="Date received" htmlFor="paid_at">
          <input id="paid_at" name="paid_at" type="date" required defaultValue={nowDateInput()} className={input} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Method" htmlFor="method" hint="e.g. GCash, bank transfer">
          <input id="method" name="method" placeholder="Bank transfer" className={input} />
        </Field>
        <Field label="Reference / note" htmlFor="note" hint="Optional">
          <input id="note" name="note" placeholder="Ref no. 12345" className={input} />
        </Field>
      </div>

      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}

      <SubmitButton pendingText="Recording…" className={btnAccent}>
        Record payment
      </SubmitButton>
    </form>
  )
}
