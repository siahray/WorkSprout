'use client'

import { useActionState } from 'react'
import { login } from '../actions'
import { AdminLogo } from '../logo'
import { display } from '@/lib/fonts'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(login, {})

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <AdminLogo badge={false} />
        </div>
        <form
          action={formAction}
          className="rounded-2xl border border-[#0E2F27]/12 bg-white p-7 shadow-[0_18px_40px_-24px_rgba(14,47,39,0.35)]"
        >
          <h1 className={`${display.className} text-2xl font-extrabold tracking-tight`}>Admin sign in</h1>
          <p className="mt-1 text-sm text-[#0E2F27]/65">Restricted to the WorkSprout team.</p>

          <div className="mt-6 space-y-4">
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
                className={`w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3 text-[#0E2F27] placeholder:text-[#0E2F27]/40 ${focus}`}
                placeholder="you@worksprout.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className={`w-full rounded-xl border border-[#0E2F27]/20 bg-white px-4 py-3 text-[#0E2F27] ${focus}`}
              />
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
            className={`mt-6 w-full rounded-xl bg-[#0E2F27] px-5 py-3 font-semibold text-white hover:bg-[#1F6B52] disabled:opacity-60 ${focus}`}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
