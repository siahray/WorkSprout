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
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2E9E6B]/10">
        <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 26V15" stroke="#F4B63F" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M16 16c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z" fill="#2E9E6B" />
          <path d="M16 14c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" fill="#F4B63F" />
        </svg>
      </span>
      <h3 className={`${display.className} mt-5 text-xl font-extrabold tracking-tight`}>{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#0E2F27]/65">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={`mt-6 ${btnPrimary} ${focus}`}>
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  )
}
