'use client'

import { useActionState } from 'react'
import { login } from '../actions'
import { AdminLogo } from '../logo'
import { display } from '@/lib/fonts'
import { btnPrimary, focus } from '@/lib/ui'

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
          className="rounded-panel border border-line bg-panel p-7 shadow-raised"
        >
          <h1 className={`${display.className} text-2xl font-extrabold tracking-tight`}>Admin sign in</h1>
          <p className="mt-1 text-sm text-ink-2">Restricted to the WorkSprout team.</p>

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
                className={`w-full rounded-control border border-line-strong bg-panel px-4 py-3 text-ink placeholder:text-ink-4 ${focus}`}
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
                className={`w-full rounded-control border border-line-strong bg-panel px-4 py-3 text-ink ${focus}`}
              />
            </div>
          </div>

          {state.error && (
            <p role="alert" className="mt-4 rounded-control bg-danger-wash px-3 py-2 text-sm font-medium text-danger">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className={`mt-6 w-full ${btnPrimary} px-5 py-3`}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
