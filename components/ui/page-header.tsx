import type { ReactNode } from 'react'
import { display } from '@/lib/fonts'

export function PageHeader({
  title,
  description,
  eyebrow,
  children,
}: {
  title: string
  description?: string
  eyebrow?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-[#0E2F27]/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1F6B52]">{eyebrow}</p>
        )}
        <h1 className={`${display.className} text-[2rem] font-extrabold leading-[1.05] tracking-tight`}>{title}</h1>
        {description && <p className="mt-2.5 max-w-xl text-[#0E2F27]/65">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
