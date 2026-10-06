'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signup } from './actions'
import { Logo } from '@/components/logo'
import { display } from '@/lib/fonts'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

const input =
  'w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3.5 text-[#0E2F27] placeholder:text-[#0E2F27]/40 transition-colors hover:border-[#0E2F27]/40 ' +
  focus

const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

const LEVELS = [
  { label: '', color: '' },
  { label: 'Too short', color: '#f87171' },
  { label: 'Okay', color: '#F4B63F' },
  { label: 'Good', color: '#2E9E6B' },
  { label: 'Strong', color: '#1F6B52' },
]

function strength(pw: string) {
  if (!pw) return 0
  if (pw.length < 8) return 1
  const bonus =
    Number(pw.length >= 12) + Number(/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) + Number(/[^A-Za-z0-9]/.test(pw))
  return Math.min(4, 2 + bonus)
}

function SproutLoader() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
      <g className="ws-pulse">
        <path d="M16 28V16" stroke="#F4B63F" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 17c0-5-3.5-8-9-8 0 5 3.5 8 9 8z" fill="#2E9E6B" />
        <path d="M16 14c0-4.5 3-7.5 9-7.5 0 4.5-3 7.5-9 7.5z" fill="#F4B63F" />
      </g>
    </svg>
  )
}

export function SignupForm({ initialEmail }: { initialEmail: string }) {
  const [state, formAction, pending] = useActionState(signup, {})
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const level = strength(password)

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
        <div className="ws-rise" style={delay(1)}>
          <span className="mb-3 inline-block rounded-full bg-[#F4B63F] px-2.5 py-0.5 text-xs font-semibold">
            Free beta
          </span>
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Create your account</h1>
          <p className="mt-1.5 text-[#0E2F27]/65">
            Beta access is invite-only. Sign up with the email you joined the beta with.
          </p>
        </div>

        <div className="mt-7 space-y-5">
          <div className="ws-rise" style={delay(2)}>
            <label htmlFor="full_name" className="mb-1.5 block text-sm font-semibold">
              Your name <span className="font-normal text-[#0E2F27]/50">(optional)</span>
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
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
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
                className={`${input} pr-16`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#1F6B52] hover:bg-[#1F6B52]/10 ${focus}`}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full bg-[#0E2F27]/10 transition-colors duration-300 motion-reduce:transition-none"
                  style={i <= level ? { backgroundColor: LEVELS[level].color } : undefined}
                />
              ))}
            </div>
            <p aria-live="polite" className="mt-1.5 h-4 text-xs font-medium text-[#0E2F27]/65">
              {level > 0 && `Password strength: ${LEVELS[level].label}`}
            </p>
          </div>
        </div>

        {state.error && (
          <p
            key={state.error}
            role="alert"
            className="ws-shake mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="ws-rise" style={delay(5)}>
          <button
            type="submit"
            disabled={pending}
            className={`mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#F4B63F] px-5 py-3.5 text-base font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] disabled:cursor-wait disabled:opacity-80 ${focus}`}
          >
            {pending && <SproutLoader />}
            {pending ? 'Creating your account…' : 'Create account'}
          </button>
        </div>

        <div className="ws-rise mt-6 space-y-2 text-center text-sm text-[#0E2F27]/65" style={delay(6)}>
          <p>
            Already have an account?{' '}
            <Link href="/login" className={`rounded font-semibold text-[#1F6B52] hover:underline ${focus}`}>
              Log in
            </Link>
          </p>
          <p>
            Not on the beta list yet?{' '}
            <Link href="/join" className={`rounded font-semibold text-[#1F6B52] hover:underline ${focus}`}>
              Join the beta
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}