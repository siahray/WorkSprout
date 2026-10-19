import type { ReactNode } from 'react'
import { display } from '@/lib/fonts'
import { focus } from '@/lib/ui'

export function Collapsible({
  title,
  count,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string
  count?: number
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="group" open={defaultOpen}>
      <summary
        className={`flex list-none cursor-pointer items-center justify-between gap-3 rounded-control py-1 [&::-webkit-details-marker]:hidden ${focus}`}
      >
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className={`${display.className} text-xl font-extrabold tracking-tight`}>{title}</span>
          {count !== undefined && (
            <span className="rounded-full bg-canvas px-2.5 py-0.5 text-xs font-semibold text-ink-3">
              {count}
            </span>
          )}
          {subtitle && <span className="text-sm text-ink-3">{subtitle}</span>}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-ink-4 transition-transform group-open:rotate-180"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}