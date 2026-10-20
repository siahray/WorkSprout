'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Logo } from '@/components/logo'
import { NavFooter } from '@/components/nav-footer'
import { NavLinks } from '@/components/nav-links'
import { pauseTimer, resumeTimer, stopTimer } from '@/app/(app)/time/actions'
import { focus, railSurface } from '@/lib/ui'
import { formatElapsed, timerElapsedSeconds, type RunningTimer } from '@/lib/timer'

export type ActiveTimerInfo = RunningTimer

/**
 * Below `lg` the sidebar collapses into a drawer that slides in from the
 * right. The panel is portalled to `document.body` because the sticky header
 * has a backdrop-filter, which would otherwise make it the containing block
 * for the drawer's fixed positioning.
 *
 * The panel only mounts on the first open (and stays mounted afterwards so it
 * can slide out); two animation frames pass before it becomes visible, giving
 * the browser a painted closed state to transition from.
 */
export function MobileNav({ email, name, active }: { email: string; name: string; active?: ActiveTimerInfo | null }) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [now, setNow] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [active])

  // Escape closes, the page behind stops scrolling, and focus returns to the
  // toggle so keyboard users land where they started. Everything here touches
  // the DOM rather than React state, so nothing re-enters the render cycle.
  useEffect(() => {
    if (!open) return
    const toggle = toggleRef.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      toggle?.focus()
    }
  }, [open])

  const show = () => {
    setTimerOpen(false)
    setMounted(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true))
    })
  }

  function run(action: () => Promise<{ error?: string } | void>) {
    startTransition(async () => {
      await action()
    })
  }

  const paused = active?.pausedAt != null
  const elapsed = active ? formatElapsed(timerElapsedSeconds(active, now)) : null

  return (
    <>
      <div className="flex items-center gap-1 md:hidden">
        {active && (
          <button
            type="button"
            onClick={() => setTimerOpen((v) => !v)}
            aria-expanded={timerOpen}
            className={`inline-flex items-center gap-2 rounded-control px-2.5 py-1.5 text-small font-semibold tabular-nums ${
              paused
                ? 'bg-mango-wash text-mango-deep ring-1 ring-mango/40'
                : 'bg-sprout-wash text-sprout-deep ring-1 ring-sprout/30'
            } ${focus}`}
          >
            <span className="relative flex h-1.5 w-1.5">
              {!paused && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sprout opacity-70" />
              )}
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${paused ? 'bg-mango' : 'bg-sprout'}`}
              />
            </span>
            {elapsed}
          </button>
        )}
        <button
          ref={toggleRef}
          type="button"
          onClick={show}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label="Open menu"
          className={`inline-flex items-center justify-center rounded-control p-2 text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink lg:hidden print:hidden ${focus}`}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {active && timerOpen && (
        <div className="fixed inset-x-0 top-[calc(56px+env(safe-area-inset-top))] z-30 mx-3 rounded-panel border border-line bg-panel p-3 shadow-overlay md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-small font-medium text-ink">{active.label}</p>
              <p
                suppressHydrationWarning
                className={`mt-1 text-xl font-extrabold tabular-nums ${paused ? 'text-mango-deep' : 'text-sprout-deep'}`}
              >
                {elapsed}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => (paused ? resumeTimer(active.id) : pauseTimer(active.id)))}
                className="rounded-control bg-canvas px-3 py-1.5 text-meta font-semibold ring-1 ring-line-strong"
              >
                {pending ? '…' : paused ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => stopTimer(active.id))}
                className="rounded-control bg-ink px-3 py-1.5 text-meta font-semibold text-white"
              >
                {pending ? '…' : 'Stop'}
              </button>
            </div>
          </div>
        </div>
      )}

      {mounted &&
        createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden print:hidden ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            />
            <aside
              id="mobile-nav"
              aria-label="Menu"
              inert={!open}
              style={railSurface}
              className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-ink shadow-overlay transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden print:hidden ${
                open ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={`inline-flex rounded-control text-white ${focus}`}
                  aria-label="WorkSprout dashboard"
                >
                  <Logo size={30} />
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className={`inline-flex items-center justify-center rounded-control p-2 text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white ${focus}`}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto overscroll-contain px-3">
                <NavLinks onNavigate={() => setOpen(false)} />
              </nav>
              <div className="border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <NavFooter email={email} name={name} onNavigate={() => setOpen(false)} />
              </div>
            </aside>
          </>,
          document.body,
        )}
    </>
  )
}
