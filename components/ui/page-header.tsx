import type { ReactNode } from 'react'
import { display } from '@/lib/fonts'
import { meta } from '@/lib/ui'

/**
 * The top of every page. No rule under the title: the panels below already
 * structure the page, and an extra hairline just draws a second edge beside
 * them. Spacing does the separating instead.
 */
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
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className={`mb-1.5 ${meta}`}>{eyebrow}</p>}
        <h1 className={`${display.className} text-page font-extrabold tracking-[-0.02em] text-ink`}>{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-body text-ink-2">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
