import Link from 'next/link'
import type { ReactNode } from 'react'
import { body } from '@/lib/fonts'
import { Logo } from '@/components/logo'
import { NavLinks } from '@/components/nav-links'
import { ActiveTimer, type ActiveTimerInfo } from '@/components/active-timer'
import { TimerSync } from '@/components/timer-sync'
import { logout } from '@/app/(app)/actions'
import { btnGhost, focus } from '@/lib/ui'

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
      <div className="lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="sticky top-0 hidden h-screen flex-col border-r border-[#0E2F27]/10 bg-white lg:flex print:hidden">
          <div className="px-5 py-5">
            <Link href="/dashboard" className={`inline-flex rounded-lg ${focus}`} aria-label="WorkSprout dashboard">
              <Logo size={30} />
            </Link>
          </div>
          <nav className="flex-1 px-3 py-2">
            <NavLinks />
          </nav>
          <div className="border-t border-[#0E2F27]/10 p-4">
            <p className="truncate text-sm font-semibold">{name || email}</p>
            <p className="truncate text-xs text-[#0E2F27]/55">{email}</p>
            <form action={logout} className="mt-3">
              <button className={`${btnGhost} w-full justify-start`}>Sign out</button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-[#0E2F27]/10 bg-white/90 backdrop-blur print:hidden">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Link href="/dashboard" className={`lg:hidden ${focus}`} aria-label="WorkSprout dashboard">
                <Logo size={26} />
              </Link>
              <div className="ml-auto flex items-center gap-3">
                <ActiveTimer active={active} />
                <form action={logout} className="hidden sm:block">
                  <button className={btnGhost}>Sign out</button>
                </form>
              </div>
            </div>
            <div className="overflow-x-auto border-t border-[#0E2F27]/10 px-2 lg:hidden">
              <NavLinks variant="bar" />
            </div>
          </header>

          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10 print:p-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
