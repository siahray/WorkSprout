'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Logo } from '@/components/logo'
import { NavFooter } from '@/components/nav-footer'
import { NavLinks } from '@/components/nav-links'
import { focus } from '@/lib/ui'

// Same weave texture as the desktop sidebar, so the drawer reads as the
// sidebar pulled in from the right rather than a separate surface.
const weave = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 16px)',
}

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
export function MobileNav({ email, name }: { email: string; name: string }) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

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
    setMounted(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOpen(true))
    })
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={show}
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label="Open menu"
        className={`inline-flex items-center justify-center rounded-lg p-2 text-[#0E2F27]/70 transition-colors hover:bg-[#0E2F27]/5 hover:text-[#0E2F27] lg:hidden print:hidden ${focus}`}
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

      {mounted &&
        createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => setOpen(false)}
              className={`fixed inset-0 z-40 bg-[#0E2F27]/40 transition-opacity duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden print:hidden ${
                open ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            />
            <aside
              id="mobile-nav"
              aria-label="Menu"
              inert={!open}
              style={weave}
              className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[#0E2F27] shadow-2xl transition-transform duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:hidden print:hidden ${
                open ? 'translate-x-0' : 'translate-x-full'
              }`}
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={`inline-flex rounded-lg text-white ${focus}`}
                  aria-label="WorkSprout dashboard"
                >
                  <Logo size={30} />
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className={`inline-flex items-center justify-center rounded-lg p-2 text-white/70 transition-colors hover:bg-white/5 hover:text-white ${focus}`}
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
              <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-2">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Workspace
                </p>
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
