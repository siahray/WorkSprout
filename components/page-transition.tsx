'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'

// useLayoutEffect warns during SSR, which this component renders on. Deferring
// to useEffect on the server keeps the warning away; on the client the layout
// effect matters, because it runs before the browser paints.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect

/**
 * Fades and lifts the page content on every navigation.
 *
 * Server-rendered pages otherwise land with no transition at all, which is what
 * makes an App Router app feel like it snaps between routes. The animation is
 * restarted by toggling a class rather than by keying the subtree, so children
 * are never remounted and no form or scroll state is lost.
 *
 * The restart has to happen before paint — with `useEffect` the new page would
 * flash at full opacity for one frame, then jump back to zero and fade in.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)
  const previous = useRef<string | null>(null)

  useIsomorphicLayoutEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname

    const el = ref.current
    if (!el) return
    // Restart the CSS animation. Reading offsetWidth forces a reflow, so the
    // browser commits the removal before the class is added back.
    el.classList.remove('animate-page-in')
    void el.offsetWidth
    el.classList.add('animate-page-in')
  }, [pathname])

  return (
    <div ref={ref} className="animate-page-in">
      {children}
    </div>
  )
}
