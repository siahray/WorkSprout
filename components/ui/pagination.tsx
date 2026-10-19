import Link from 'next/link'
import { listHref } from '@/lib/pagination'
import { btnGhost } from '@/lib/ui'

/**
 * Previous/Next footer for a paginated table, rendered inside the table panel.
 * Returns nothing on single-page lists so small tables look untouched.
 */
export function Pagination({
  page,
  pages,
  basePath,
  params,
}: {
  page: number
  pages: number
  basePath: string
  params?: Record<string, string | undefined>
}) {
  if (pages <= 1) return null

  const control = (target: number, text: string, disabled: boolean) =>
    disabled ? (
      <span className={`${btnGhost} opacity-40`} aria-disabled="true">
        {text}
      </span>
    ) : (
      <Link href={listHref(basePath, params ?? {}, target)} className={btnGhost}>
        {text}
      </Link>
    )

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-line px-5 py-3"
    >
      <span className="text-small tabular-nums text-ink-3">
        Page {page} of {pages}
      </span>
      <span className="flex items-center gap-1">
        {control(page - 1, 'Previous', page <= 1)}
        {control(page + 1, 'Next', page >= pages)}
      </span>
    </nav>
  )
}
