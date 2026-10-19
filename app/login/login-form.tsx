'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import { Logo } from '@/components/logo'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'
import { alertError, btnMango, focus, input, label } from '@/lib/ui'

// Staggered entrance: each block rises in slightly after the previous one.
const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

function SproutLoader() {
  return <LogoMark size={18} className="ws-pulse" />
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, {})
  const [showPassword, setShowPassword] = useState(false)

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

      <form action={formAction} aria-busy={pending} className="rounded-panel border border-line bg-panel p-8 shadow-overlay">
        <div className="ws-rise" style={delay(1)}>
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Welcome back</h1>
          <p className="mt-1.5 text-ink-2">Log in to pick up where you left off.</p>
        </div>

        <div className="mt-7 space-y-5">
          <div className="ws-rise" style={delay(2)}>
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
              defaultValue={state.email}
              disabled={pending}
              className={input}
            />
          </div>

          <div className="ws-rise" style={delay(3)}>
            <label htmlFor="password" className={`mb-1.5 ${label}`}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
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
            <p className="mt-1.5 text-right text-sm">
              <Link
                href="/forgot-password"
                className={`rounded font-medium text-sprout-deep hover:underline ${focus}`}
              >
                Forgot password?
              </Link>
            </p>
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

        <div className="ws-rise" style={delay(4)}>
          <button
            type="submit"
            disabled={pending}
            className={`mt-7 w-full ${btnMango}`}
          >
            {pending && <SproutLoader />}
            {pending ? 'Logging in…' : 'Log in'}
          </button>
        </div>

        <div className="ws-rise mt-6 space-y-2 text-center text-sm text-ink-2" style={delay(5)}>
          <p>
            Been invited?{' '}
            <Link href="/signup" className={`rounded font-semibold text-sprout-deep hover:underline ${focus}`}>
              Start here
            </Link>
          </p>
          <p>
            Not on the beta list yet?{' '}
            <Link href="/join" className={`rounded font-semibold text-sprout-deep hover:underline ${focus}`}>
              Join the beta
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}