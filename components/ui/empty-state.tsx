import type { ReactNode } from 'react'
import { card, btnPrimary, focus } from '@/lib/ui'
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
    <div className={`${card} px-6 py-14 text-center`}>
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-[#0E2F27]/65">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className={`mt-6 ${btnPrimary} ${focus}`}>
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  )
}
