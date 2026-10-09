import Link from 'next/link'
import type { ReactNode } from 'react'
import { body } from '@/lib/fonts'
import { Logo } from '@/components/logo'
import { NavLinks } from '@/components/nav-links'
import { ActiveTimer, type ActiveTimerInfo } from '@/components/active-timer'
import { TimerSync } from '@/components/timer-sync'
import { logout } from '@/app/(app)/actions'
import { focus } from '@/lib/ui'

const weave = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 16px)',
}

export function AppShell({
  email,
  name,
  active,
  children,
}: {
  email: string
  name: string
  active: ActiveTimerInfo | null
  children: ReactNode
}) {
  return (
    <div className={`${body.className} min-h-screen bg-[#F4F8F5] text-[#0E2F27]`}>
      <TimerSync running={active != null} />
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col bg-[#0E2F27] lg:flex print:hidden" style={weave}>
          <div className="px-5 py-6">
            <Link
              href="/dashboard"
              className={`inline-flex rounded-lg text-white ${focus}`}
              aria-label="WorkSprout dashboard"
            >
              <Logo size={34} />
            </Link>
          </div>
          <nav className="flex-1 px-3 py-2">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Workspace
            </p>
            <NavLinks />
          </nav>
          <div className="border-t border-white/10 p-4">
            <p className="truncate text-sm font-semibold text-white">{name || email}</p>
            <p className="truncate text-xs text-white/50">{email}</p>
            <form action={logout} className="mt-3">
              <button
                className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white ${focus}`}
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-[#0E2F27]/10 bg-[#F4F8F5]/85 backdrop-blur print:hidden">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Link href="/dashboard" className={`lg:hidden ${focus}`} aria-label="WorkSprout dashboard">
                <Logo size={30} />
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <ActiveTimer active={active} />
                <form action={logout} className="hidden sm:block">
                  <button
                    className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[#0E2F27]/70 transition-colors hover:bg-[#0E2F27]/5 hover:text-[#0E2F27] ${focus}`}
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
            <div className="overflow-x-auto border-t border-[#0E2F27]/10 px-2 lg:hidden">
              <NavLinks variant="bar" />
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-10 print:max-w-none print:p-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
