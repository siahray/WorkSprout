import type { ReactNode } from 'react'
import { body, display } from '@/lib/fonts'

const weave = {
  backgroundColor: '#0E2F27',
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 14px)',
}

// Every auth animation lives here. All of them are disabled under prefers-reduced-motion.
const css = `
  @keyframes ws-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
  @keyframes ws-draw { from { stroke-dasharray: 1; stroke-dashoffset: 1; } to { stroke-dasharray: 1; stroke-dashoffset: 0; } }
  @keyframes ws-leaf { from { opacity: 0; transform: scale(0) rotate(-12deg); } to { opacity: 1; transform: none; } }
  @keyframes ws-sway { 0%, 100% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } }
  @keyframes ws-shake { 0%, 100% { transform: none; } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
  @keyframes ws-pulse { from { transform: scale(.7) rotate(-8deg); } to { transform: scale(1.1) rotate(8deg); } }
  .ws-rise { animation: ws-rise 600ms cubic-bezier(.2,.8,.3,1) both; }
  .ws-draw { animation: ws-draw 900ms 200ms ease-out both; }
  .ws-leaf { transform-box: fill-box; transform-origin: 100% 100%; animation: ws-leaf 700ms 900ms cubic-bezier(.2,.8,.3,1) both; }
  .ws-leaf-r { transform-origin: 0% 100%; animation-delay: 1.2s; }
  .ws-sway { transform-origin: 50% 90%; animation: ws-sway 5s 2.2s ease-in-out infinite; }
  .ws-shake { animation: ws-shake 400ms; }
  .ws-pulse { transform-box: fill-box; transform-origin: 50% 100%; animation: ws-pulse 700ms ease-in-out infinite alternate; }
  @media (prefers-reduced-motion: reduce) {
    .ws-rise, .ws-draw, .ws-leaf, .ws-sway, .ws-shake, .ws-pulse { animation: none; }
  }
`

export function AuthShell({
  heading,
  text,
  children,
}: {
  heading: string
  text: string
  children: ReactNode
}) {
  return (
    <div className={`${body.className} grid min-h-screen text-[#0E2F27] lg:grid-cols-[0.95fr_1.05fr]`}>
      <style>{css}</style>

      <aside
        className="relative hidden flex-col items-center justify-center overflow-hidden px-12 text-center text-white lg:flex"
        style={weave}
      >
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#2E9E6B]/25 blur-3xl"
          aria-hidden="true"
        />
        <span className="relative mb-10 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/75">
          Free beta · no card needed
        </span>
        <svg viewBox="0 0 200 220" className="ws-sway relative h-56 w-56" aria-hidden="true">
          <ellipse cx="100" cy="206" rx="46" ry="6" fill="#000" opacity=".25" />
          <path
            d="M100 204V108"
            pathLength={1}
            stroke="#F4B63F"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            className="ws-draw"
          />
          <path className="ws-leaf" d="M100 124c0-38-26-60-64-60 0 38 26 60 64 60z" fill="#2E9E6B" />
          <path className="ws-leaf ws-leaf-r" d="M100 104c0-34 22-54 64-54 0 34-22 54-64 54z" fill="#F4B63F" />
        </svg>
        <h2
          className={`${display.className} ws-rise relative mt-8 max-w-sm text-4xl font-extrabold leading-tight tracking-tight`}
          style={{ animationDelay: '1.5s' }}
        >
          {heading}
        </h2>
        <span className="ws-rise relative mt-5 h-1 w-10 rounded-full bg-[#F4B63F]" style={{ animationDelay: '1.6s' }} />
        <p className="ws-rise relative mt-5 max-w-xs text-white/75" style={{ animationDelay: '1.7s' }}>
          {text}
        </p>
      </aside>

      <main className="flex items-center bg-[#F4F8F5] py-10">{children}</main>
    </div>
  )
}