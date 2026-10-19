'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'
import { Logo } from '@/components/logo'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'
import { alertError, btnMango, focus, input, label } from '@/lib/ui'


// Staggered entrance: each block rises in slightly after the previous one.
const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

function SproutLoader() {
  return <LogoMark size={18} className="ws-pulse" />
}

export function ForgotPasswordForm({ expired }: { expired: boolean }) {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {})

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
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Reset your password</h1>
          <p className="mt-1.5 text-ink-2">
            Enter the email you signed up with and we&rsquo;ll send you a link to choose a new password.
          </p>
        </div>

        {expired && (
          <p
            role="alert"
            className="ws-rise mt-5 rounded-control bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800"
            style={delay(2)}
          >
            That link was invalid or already used. Request a fresh one below.
          </p>
        )}

        {state.sent ? (
          <div className="ws-rise mt-7" style={delay(3)}>
            <div
              role="status"
              className="rounded-control border border-sprout/25 bg-sprout/8 px-4 py-3.5 text-sm text-ink"
            >
              <p className="font-semibold">Check your inbox.</p>
              <p className="mt-1 text-ink-2">
                If <span className="font-medium">{state.email}</span> has a WorkSprout account, a reset link is on its
                way. The link works once and expires after a while.
              </p>
            </div>
            <p className="mt-5 text-center text-sm text-ink-2">
              Wrong address?{' '}
              <Link href="/forgot-password" className={`rounded font-semibold text-sprout-deep hover:underline ${focus}`}>
                Try another email
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="ws-rise mt-7 space-y-5" style={delay(3)}>
              <div>
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
                {pending ? 'Sending link…' : 'Send reset link'}
              </button>
            </div>
          </>
        )}

        <p className="ws-rise mt-6 text-center text-sm text-ink-2" style={delay(5)}>
          Remembered it?{' '}
          <Link href="/login" className={`rounded font-semibold text-sprout-deep hover:underline ${focus}`}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
