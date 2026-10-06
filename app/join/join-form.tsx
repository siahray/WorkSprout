'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { joinBeta } from './actions'
import { display } from '@/lib/fonts'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

const professionSuggestions = [
  'Virtual assistant',
  'Developer',
  'Designer',
  'Writer',
  'Photographer',
  'Videographer',
  'Accountant',
  'Marketer',
  'Consultant',
  'Other',
]

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0E2F27" />
        <path d="M16 25V15" stroke="#F4B63F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 16c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z" fill="#2E9E6B" />
        <path d="M16 14c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" fill="#F4B63F" />
      </svg>
      <span className={`${display.className} text-2xl font-extrabold tracking-tight`}>WorkSprout</span>
    </span>
  )
}

export function JoinForm({ initialEmail, source }: { initialEmail: string; source: string }) {
  const [state, formAction, pending] = useActionState(joinBeta, {})

  return (
    <div className="mx-auto w-full max-w-md px-6">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className={`${focus} rounded-lg`}>
          <Logo />
        </Link>
        <Link
          href="/"
          className={`text-sm font-medium text-[#0E2F27]/70 hover:text-[#0E2F27] ${focus} rounded-lg px-2 py-1`}
        >
          ← Back
        </Link>
      </div>

      <form
        action={formAction}
        className="rounded-2xl border border-[#0E2F27]/12 bg-white p-7 shadow-[0_18px_40px_-24px_rgba(14,47,39,0.35)]"
      >
        <input type="hidden" name="source" value={source} />
        <h1 className={`${display.className} text-2xl font-extrabold tracking-tight`}>Get free beta access</h1>
        <p className="mt-1 text-sm text-[#0E2F27]/65">
          Free during the beta. No card needed — just tell us a bit about you.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium">
              Your name
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              autoComplete="name"
              placeholder="Juan Dela Cruz"
              className={`w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3 text-[#0E2F27] placeholder:text-[#0E2F27]/40 ${focus}`}
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={initialEmail}
              placeholder="you@email.com"
              className={`w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3 text-[#0E2F27] placeholder:text-[#0E2F27]/40 ${focus}`}
            />
          </div>
          <div>
            <label htmlFor="profession" className="mb-1.5 block text-sm font-medium">
              Profession / field
            </label>
            <input
              id="profession"
              name="profession"
              type="text"
              required
              list="profession-suggestions"
              placeholder="e.g. Virtual assistant, Developer, Designer"
              className={`w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3 text-[#0E2F27] placeholder:text-[#0E2F27]/40 ${focus}`}
            />
            <datalist id="profession-suggestions">
              {professionSuggestions.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        {state.error && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={`mt-6 w-full rounded-xl bg-[#F4B63F] px-5 py-3 font-semibold text-[#0E2F27] hover:bg-[#e9a82a] disabled:opacity-60 ${focus}`}
        >
          {pending ? 'Joining…' : 'Join the beta'}
        </button>

        <p className="mt-4 text-center text-xs text-[#0E2F27]/55">
          No password needed — we will set up your account when your invite is ready.
        </p>
      </form>
    </div>
  )
}
