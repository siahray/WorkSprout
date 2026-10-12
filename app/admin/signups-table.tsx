'use client'

import { useActionState, useState } from 'react'
import { bulkDeleteSignups, deleteSignup } from '@/app/admin/admin-actions'
import { InviteButton } from '@/app/admin/invite-button'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { btnDanger, focus, rowHover, tableHead, th } from '@/lib/ui'
import type { SignupRow } from '@/app/admin/types'

const BULK_FORM = 'signups-bulk'

export function SignupsTable({
  signups,
  claimsEmail,
}: {
  signups: SignupRow[]
  claimsEmail?: string | null
}) {
  const [state, action, pending] = useActionState(bulkDeleteSignups, {})
  const [selected, setSelected] = useState<string[]>([])

  const allSelected = signups.length > 0 && selected.length === signups.length

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#0E2F27]/12 bg-white">
      <form
        id={BULK_FORM}
        action={action}
        onSubmit={(event) => {
          const count = selected.length
          if (
            count > 0 &&
            !window.confirm(`Delete ${count} signup${count === 1 ? '' : 's'}? This cannot be undone.`)
          ) {
            event.preventDefault()
          }
        }}
        className="flex flex-wrap items-center gap-3 border-b border-[#0E2F27]/10 bg-[#F4F8F5] px-5 py-3"
      >
        <button
          type="submit"
          disabled={pending || selected.length === 0}
          className={`${btnDanger} px-3 py-1.5 text-xs`}
        >
          {pending ? 'Deleting…' : `Delete selected${selected.length ? ` (${selected.length})` : ''}`}
        </button>
        {state.error && (
          <span role="alert" className="text-xs font-medium text-red-700">
            {state.error}
          </span>
        )}
        {state.ok && <span className="text-xs font-medium text-[#1F6B52]">{state.ok}</span>}
      </form>

      {signups.length === 0 ? (
        <p className="p-10 text-center text-[#0E2F27]/60">No signups match your filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={`${th} w-10`}>
                  <input
                    type="checkbox"
                    aria-label="Select all signups"
                    checked={allSelected}
                    onChange={(e) => setSelected(e.target.checked ? signups.map((s) => s.id) : [])}
                    className={`h-4 w-4 rounded border-[#0E2F27]/30 ${focus}`}
                  />
                </th>
                <th className={th}>Email</th>
                <th className={th}>Name</th>
                <th className={th}>Profession</th>
                <th className={th}>Signed up</th>
                <th className={th}>Invite</th>
                <th className={`${th} text-right`}>Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E2F27]/10">
              {signups.map((s) => (
                <tr key={s.id} className={rowHover}>
                  <td className="px-5 py-3.5">
                    <input
                      type="checkbox"
                      name="ids"
                      value={s.id}
                      form={BULK_FORM}
                      checked={selected.includes(s.id)}
                      onChange={() => toggle(s.id)}
                      aria-label={`Select ${s.email ?? 'signup'}`}
                      className={`h-4 w-4 rounded border-[#0E2F27]/30 ${focus}`}
                    />
                  </td>
                  <td className="px-5 py-3.5 font-medium">
                    <span className="flex items-center gap-2">
                      {s.email ?? '—'}
                      {s.email && s.email === claimsEmail && (
                        <span className="rounded-full bg-[#F4B63F]/30 px-2 py-0.5 text-xs font-semibold">
                          You
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#0E2F27]/75">{s.full_name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-[#0E2F27]/75">{s.profession ?? '—'}</td>
                  <td className="px-5 py-3.5 tabular-nums text-[#0E2F27]/65">
                    {new Date(s.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    {s.email ? (
                      <div className="flex flex-col items-start gap-1">
                        <InviteButton email={s.email} invited={Boolean(s.invited_at)} />
                        {s.invited_at && (
                          <span className="text-xs text-[#0E2F27]/50">
                            Invited{' '}
                            {new Date(s.invited_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#0E2F27]/50">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <ConfirmAction
                      action={deleteSignup}
                      id={s.id}
                      message={`Delete ${s.email ?? 'this signup'}? This cannot be undone.`}
                      className={`${btnDanger} px-2.5 py-1.5 text-xs`}
                    >
                      Delete
                    </ConfirmAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
