import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/logo'
import { MobileNav } from '@/components/mobile-nav'
import { NavFooter } from '@/components/nav-footer'
import { NavLinks } from '@/components/nav-links'
import { PageTransition } from '@/components/page-transition'
import { ActiveTimer, type ActiveTimerInfo } from '@/components/active-timer'
import { TimerSync } from '@/components/timer-sync'
import { logout } from '@/app/(app)/actions'
import { focus, railSurface } from '@/lib/ui'

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
    <div className="min-h-screen bg-canvas text-ink">
      <TimerSync running={active != null} />
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        {/* The rail carries no section label: there is one group of links, so a
            label above it would be decoration. */}
        <aside
          className="sticky top-0 hidden h-screen flex-col bg-ink lg:flex print:hidden"
          style={railSurface}
        >
          <div className="px-5 pb-5 pt-6">
            <Link
              href="/dashboard"
              className={`inline-flex rounded-control text-white ${focus}`}
              aria-label="WorkSprout dashboard"
            >
              <Logo size={32} />
            </Link>
          </div>
          <nav className="flex-1 px-3">
            <NavLinks />
          </nav>
          <div className="border-t border-white/10 p-4">
            <NavFooter email={email} name={name} />
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur-md print:hidden">
            <div className="flex items-center gap-3 px-4 py-2 sm:px-6 lg:px-12">
              <Link href="/dashboard" className={`lg:hidden ${focus}`} aria-label="WorkSprout dashboard">
                <Logo size={26} />
              </Link>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <div className="hidden md:block">
                  <ActiveTimer active={active} />
                </div>
                <form action={logout} className="hidden sm:block">
                  <button
                    className={`rounded-control px-3 py-2 text-small font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink ${focus}`}
                  >
                    Sign out
                  </button>
                </form>
                <MobileNav email={email} name={name} active={active} />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-9 sm:px-8 lg:px-12 lg:py-10 print:max-w-none print:p-0">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </div>
  )
}
