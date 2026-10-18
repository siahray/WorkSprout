'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from './actions'
import { Logo } from '@/components/logo'
import { LogoMark } from '@/components/logo-mark'
import { display } from '@/lib/fonts'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

const input =
  'w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3.5 text-[#0E2F27] placeholder:text-[#0E2F27]/40 transition-colors hover:border-[#0E2F27]/40 ' +
  focus

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
        <Link href="/" className={`${focus} rounded-lg`}>
          <Logo />
        </Link>
        <Link
          href="/login"
          className={`rounded-lg px-2 py-1 text-sm font-medium text-[#0E2F27]/70 hover:text-[#0E2F27] ${focus}`}
        >
          Log in
        </Link>
      </div>

      <form
        action={formAction}
        aria-busy={pending}
        className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]"
      >
        <div className="ws-rise" style={delay(1)}>
          <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>Reset your password</h1>
          <p className="mt-1.5 text-[#0E2F27]/65">
            Enter the email you signed up with and we&rsquo;ll send you a link to choose a new password.
          </p>
        </div>

        {expired && (
          <p
            role="alert"
            className="ws-rise mt-5 rounded-lg bg-amber-50 px-3.5 py-2.5 text-sm font-medium text-amber-800"
            style={delay(2)}
          >
            That link was invalid or already used. Request a fresh one below.
          </p>
        )}

        {state.sent ? (
          <div className="ws-rise mt-7" style={delay(3)}>
            <div
              role="status"
              className="rounded-xl border border-[#2E9E6B]/25 bg-[#2E9E6B]/8 px-4 py-3.5 text-sm text-[#0E2F27]"
            >
              <p className="font-semibold">Check your inbox.</p>
              <p className="mt-1 text-[#0E2F27]/70">
                If <span className="font-medium">{state.email}</span> has a WorkSprout account, a reset link is on its
                way. The link works once and expires after a while.
              </p>
            </div>
            <p className="mt-5 text-center text-sm text-[#0E2F27]/65">
              Wrong address?{' '}
              <Link href="/forgot-password" className={`rounded font-semibold text-[#1F6B52] hover:underline ${focus}`}>
                Try another email
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="ws-rise mt-7 space-y-5" style={delay(3)}>
              <div>
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
                className="ws-shake mt-4 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700"
              >
                {state.error}
              </p>
            )}

            <div className="ws-rise" style={delay(4)}>
              <button
                type="submit"
                disabled={pending}
                className={`mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#F4B63F] px-5 py-3.5 text-base font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] disabled:cursor-wait disabled:opacity-80 ${focus}`}
              >
                {pending && <SproutLoader />}
                {pending ? 'Sending link…' : 'Send reset link'}
              </button>
            </div>
          </>
        )}

        <p className="ws-rise mt-6 text-center text-sm text-[#0E2F27]/65" style={delay(5)}>
          Remembered it?{' '}
          <Link href="/login" className={`rounded font-semibold text-[#1F6B52] hover:underline ${focus}`}>
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
