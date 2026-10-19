'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { joinBeta } from './actions'
import { Logo } from '@/components/logo'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'
import { alertError, btnMango, focus, input, label } from '@/lib/ui'


const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

// Quick-picks shown as chips. The full list stays available in the field's suggestions.
const quickPicks = ['Virtual assistant', 'Developer', 'Designer', 'Writer', 'Photographer']

const professionSuggestions = [
  ...quickPicks,
  'Videographer',
  'Accountant',
  'Marketer',
  'Consultant',
  'Other',
]

function SproutLoader() {
  return <LogoMark size={18} className="ws-pulse" />
}

export function JoinForm({ initialEmail, source }: { initialEmail: string; source: string }) {
  const [state, formAction, pending] = useActionState(joinBeta, {})
  const [profession, setProfession] = useState('')

  return (
    <div className="mx-auto w-full max-w-md px-6">
      <div className="ws-rise mb-8 flex items-center justify-between" style={delay(0)}>
        <Link href="/" className={`${focus} rounded-control`}>
          <Logo />
        </Link>
        <Link
          href="/"
          className={`rounded-control px-2 py-1 text-sm font-medium text-ink-2 hover:text-ink ${focus}`}
        >
          ← Back
        </Link>
      </div>

      <form
        action={formAction}
        aria-busy={pending}
        className="rounded-panel border border-line bg-panel p-8 shadow-overlay"
      >
        <input type="hidden" name="source" value={source} />

        <div className="ws-rise" style={delay(1)}>
          <span className="mb-3 inline-block rounded-full bg-mango px-2.5 py-0.5 text-xs font-semibold">
            Free beta
          </span>
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Get free beta access</h1>
          <p className="mt-1.5 text-ink-2">
            Free during the beta. Just tell us a bit about you.
          </p>
        </div>

        <div className="mt-7 space-y-5">
          <div className="ws-rise" style={delay(2)}>
            <label htmlFor="full_name" className={`mb-1.5 ${label}`}>
              Your name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              placeholder="Juan Dela Cruz"
              defaultValue={state.fullName}
              disabled={pending}
              className={input}
            />
          </div>

          <div className="ws-rise" style={delay(3)}>
            <label htmlFor="email" className={`mb-1.5 ${label}`}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@email.com"
              defaultValue={state.email ?? initialEmail}
              disabled={pending}
              className={input}
            />
          </div>

          <div className="ws-rise" style={delay(4)}>
            <label htmlFor="profession" className={`mb-1.5 ${label}`}>
              Profession / field
            </label>
            <input
              id="profession"
              name="profession"
              type="text"
              required
              list="profession-suggestions"
              placeholder="e.g. Virtual assistant, Developer, Designer"
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              disabled={pending}
              className={input}
            />
            <datalist id="profession-suggestions">
              {professionSuggestions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPicks.map((p) => {
                const active = profession === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProfession(p)}
                    aria-pressed={active}
                    disabled={pending}
                    className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${focus} ${
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-line-strong text-ink-2 hover:border-ink-4'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {state.error && (
          <p
            key={state.error}
            role="alert"
            className={`ws-shake mt-5 ${alertError}`}
          >
            {state.error}
          </p>
        )}

        <div className="ws-rise" style={delay(5)}>
          <button
            type="submit"
            disabled={pending}
            className={`mt-7 w-full ${btnMango}`}
          >
            {pending && <SproutLoader />}
            {pending ? 'Joining…' : 'Join the beta'}
          </button>
        </div>

        <div className="ws-rise mt-6 text-center text-sm text-ink-2" style={delay(6)}>
          <p className="text-xs text-ink-3">
            No password needed now. If you&rsquo;re selected, we&rsquo;ll email you a one-time code to set up your
            account.
          </p>
        </div>
      </form>
    </div>
  )
}