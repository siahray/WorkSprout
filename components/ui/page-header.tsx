import type { ReactNode } from 'react'
import { display } from '@/lib/fonts'

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className={`${display.className} text-3xl font-extrabold tracking-tight`}>{title}</h1>
        {description && <p className="mt-2 text-[#0E2F27]/70">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
