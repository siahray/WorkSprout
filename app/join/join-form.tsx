'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { joinBeta } from './actions'
import { Logo } from '@/components/logo'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

const input =
  'w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3.5 text-[#0E2F27] placeholder:text-[#0E2F27]/40 transition-colors hover:border-[#0E2F27]/40 ' +
  focus

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
        <Link href="/" className={`${focus} rounded-lg`}>
          <Logo />
        </Link>
        <Link
          href="/"
          className={`rounded-lg px-2 py-1 text-sm font-medium text-[#0E2F27]/70 hover:text-[#0E2F27] ${focus}`}
        >
          ← Back
        </Link>
      </div>

      <form
        action={formAction}
        aria-busy={pending}
        className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]"
      >
        <input type="hidden" name="source" value={source} />

        <div className="ws-rise" style={delay(1)}>
          <span className="mb-3 inline-block rounded-full bg-[#F4B63F] px-2.5 py-0.5 text-xs font-semibold">
            Free beta
          </span>
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Get free beta access</h1>
          <p className="mt-1.5 text-[#0E2F27]/65">
            Free during the beta. No card needed. Just tell us a bit about you.
          </p>
        </div>

        <div className="mt-7 space-y-5">
          <div className="ws-rise" style={delay(2)}>
            <label htmlFor="full_name" className="mb-1.5 block text-sm font-semibold">
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
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
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
            <label htmlFor="profession" className="mb-1.5 block text-sm font-semibold">
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
                        ? 'border-[#0E2F27] bg-[#0E2F27] text-white'
                        : 'border-[#0E2F27]/20 text-[#0E2F27]/75 hover:border-[#0E2F27]/50'
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
            className="ws-shake mt-5 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="ws-rise" style={delay(5)}>
          <button
            type="submit"
            disabled={pending}
            className={`mt-7 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#F4B63F] px-5 py-3.5 text-base font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] disabled:cursor-wait disabled:opacity-80 ${focus}`}
          >
            {pending && <SproutLoader />}
            {pending ? 'Joining…' : 'Join the beta'}
          </button>
        </div>

        <div className="ws-rise mt-6 text-center text-sm text-[#0E2F27]/65" style={delay(6)}>
          <p className="text-xs text-[#0E2F27]/55">
            No password needed now. If you&rsquo;re selected, we&rsquo;ll email you a one-time code to set up your
            account.
          </p>
        </div>
      </form>
    </div>
  )
}