import type { ReactNode } from 'react'
import { card, btnPrimary, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'
import Link from 'next/link'

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string
  description: string
  actionHref?: string
  actionLabel?: string
  children?: ReactNode
}) {
  return (
    <div className={`${card} px-6 py-16 text-center`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-panel bg-sprout-wash">
        <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 26V15" stroke="#F4B63F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 16c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z" fill="#2E9E6B" />
          <path d="M16 14c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" fill="#F4B63F" />
        </svg>
      </span>
      <h3 className={`${display.className} mt-5 text-title font-extrabold tracking-tight text-ink`}>{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-body leading-relaxed text-ink-2">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={`mt-6 ${btnPrimary} ${focus}`}>
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  )
}
