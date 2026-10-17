'use client'

import { useActionState, useState } from 'react'
import { Field } from '@/components/ui/field'
import { SubmitButton } from '@/components/ui/submit-button'
import { createApiKey, revokeApiKey, type ApiKeyFormState } from './actions'
import { alertError, alertOk, btnDanger, btnGhost, input, rowHover, th, tableHead } from '@/lib/ui'

// Dates are formatted on the server and passed in, so the list renders the same
// regardless of the viewer's locale.
export type ApiKeyRow = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
}

function CopyableKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked; the value is selectable by hand.
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-[#0E2F27] px-3 py-2 font-mono text-xs text-white">
        {value}
      </code>
      <button type="button" onClick={copy} className={btnGhost}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

export function ApiKeysCard({ keys }: { keys: ApiKeyRow[] }) {
  const [state, action, pending] = useActionState<ApiKeyFormState, FormData>(createApiKey, {})

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold tracking-tight">API keys</h3>
        <p className="mt-1 text-sm text-[#0E2F27]/65">
          Let an automation tool read what happens here — invoices, payments, appointments,
          clients and expenses — so it can send emails or update a CRM. A tool polls{' '}
          <code className="rounded bg-[#0E2F27]/5 px-1 py-0.5 font-mono text-xs">
            GET /api/v1/events
          </code>{' '}
          with its key and keeps the last event id as a cursor.
        </p>
      </div>

      {/* The raw key exists only in this response. Once the page is reloaded it is gone. */}
      {state.createdKey && (
        <div className="space-y-2 rounded-xl border border-[#2E9E6B]/30 bg-[#2E9E6B]/5 p-4">
          <p className="text-sm font-semibold text-[#1F6B52]">
            {state.createdName} — copy this key now
          </p>
          <CopyableKey value={state.createdKey} />
          <p className="text-xs text-[#0E2F27]/65">
            It is shown once and only a hash is stored. If you lose it, revoke the key and make
            another. Send it as <code className="font-mono">Authorization: Bearer &lt;key&gt;</code>.
          </p>
        </div>
      )}

      <form action={action} aria-busy={pending} className="space-y-4">
        <Field label="Key name" htmlFor="key_name" hint="Say where it will be used, e.g. “Make.com”.">
          <input
            id="key_name"
            name="name"
            type="text"
            maxLength={80}
            placeholder="Make.com"
            className={input}
          />
        </Field>

        {state.error && (
          <p role="alert" className={alertError}>
            {state.error}
          </p>
        )}
        {state.ok && !state.createdKey && <p className={alertOk}>{state.ok}</p>}

        <SubmitButton pendingText="Creating…">Create key</SubmitButton>
      </form>

      {keys.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th scope="col" className={th}>
                  Name
                </th>
                <th scope="col" className={th}>
                  Key
                </th>
                <th scope="col" className={th}>
                  Created
                </th>
                <th scope="col" className={th}>
                  Last used
                </th>
                <th scope="col" className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0E2F27]/8">
              {keys.map((key) => (
                <tr key={key.id} className={rowHover}>
                  <td className="px-5 py-3 font-medium">{key.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-[#0E2F27]/70">{key.prefix}…</td>
                  <td className="px-5 py-3 text-[#0E2F27]/70">{key.createdAt}</td>
                  <td className="px-5 py-3 text-[#0E2F27]/70">{key.lastUsedAt ?? 'Never'}</td>
                  <td className="px-5 py-3 text-right">
                    <form
                      action={revokeApiKey.bind(null, key.id)}
                      onSubmit={(event) => {
                        if (
                          !window.confirm(
                            `Revoke “${key.name}”? Anything using it will stop working immediately.`,
                          )
                        ) {
                          event.preventDefault()
                        }
                      }}
                    >
                      <button type="submit" className={btnDanger}>
                        Revoke
                      </button>
                    </form>
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
