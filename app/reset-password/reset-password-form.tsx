'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { setNewPassword } from './actions'
import { Logo } from '@/components/logo'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'
import { alertError, btnMango, focus, input, label } from '@/lib/ui'


// Staggered entrance: each block rises in slightly after the previous one.
const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

const LEVELS = [
  { label: '', color: '' },
  { label: 'Too short', color: 'var(--color-danger)' },
  { label: 'Okay', color: 'var(--color-mango)' },
  { label: 'Good', color: 'var(--color-sprout)' },
  { label: 'Strong', color: 'var(--color-sprout-deep)' },
]

function strength(pw: string) {
  if (!pw) return 0
  if (pw.length < 8) return 1
  const bonus =
    Number(pw.length >= 12) +
    Number(/[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw)) +
    Number(/[^A-Za-z0-9]/.test(pw))
  return Math.min(4, 2 + bonus)
}

function SproutLoader() {
  return <LogoMark size={18} className="ws-pulse" />
}

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(setNewPassword, {})
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const level = strength(password)

  return (
    <div className="mx-auto w-full max-w-md px-6">
      <div className="ws-rise mb-8 flex items-center justify-between" style={delay(0)}>
        <Link href="/" className={`${focus} rounded-control`}>
          <Logo />
        </Link>
        <Link
          href="/login"
          className={`rounded-control px-2 py-1 text-sm font-medium text-ink-2 hover:text-ink ${focus}`}
        >
          Log in
        </Link>
      </div>

      <form
        action={formAction}
        aria-busy={pending}
        className="rounded-panel border border-line bg-panel p-8 shadow-overlay"
      >
        <div className="ws-rise" style={delay(1)}>
          <span className="mb-3 inline-block rounded-full bg-sprout/15 px-2.5 py-0.5 text-xs font-semibold text-sprout-deep">
            Verified by email
          </span>
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Choose a new password</h1>
          <p className="mt-1.5 text-ink-2">
            You&rsquo;ll use this to log in from now on. Pick something you don&rsquo;t use anywhere else.
          </p>
        </div>

        <div className="mt-7 space-y-5">
          <div className="ws-rise" style={delay(2)}>
            <label htmlFor="password" className={`mb-1.5 ${label}`}>
              New password
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
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-control px-2.5 py-1.5 text-sm font-semibold text-sprout-deep hover:bg-sprout-deep/10 ${focus}`}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-2.5 flex gap-1.5" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full bg-ink/10 transition-colors duration-300 motion-reduce:transition-none"
                  style={i <= level ? { backgroundColor: LEVELS[level].color } : undefined}
                />
              ))}
            </div>
            <p aria-live="polite" className="mt-1.5 h-4 text-xs font-medium text-ink-2">
              {level > 0 && `Password strength: ${LEVELS[level].label}`}
            </p>
          </div>

          <div className="ws-rise" style={delay(3)}>
            <label htmlFor="confirm_password" className={`mb-1.5 ${label}`}>
              Confirm new password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Type it once more"
              disabled={pending}
              className={input}
            />
          </div>
        </div>

        {state.error && (
          <p
            key={state.error}
            role="alert"
            className={`ws-shake mt-4 ${alertError}`}
          >
            {state.error}
          </p>
        )}

        <div className="ws-rise" style={delay(4)}>
          <button
            type="submit"
            disabled={pending}
            className={`mt-6 w-full ${btnMango}`}
          >
            {pending && <SproutLoader />}
            {pending ? 'Saving password…' : 'Save new password'}
          </button>
        </div>

        <p className="ws-rise mt-6 text-center text-sm text-ink-2" style={delay(5)}>
          Changed your mind?{' '}
          <Link href="/login" className={`rounded font-semibold text-sprout-deep hover:underline ${focus}`}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
