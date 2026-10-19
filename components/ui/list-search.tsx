import Link from 'next/link'
import { btnPrimary, btnSecondary, card, input, label } from '@/lib/ui'

/**
 * GET-form search box for a list page. Submitting replaces the query string,
 * which deliberately drops any ?page= — a new search starts back at page 1.
 * Server-rendered, so it needs no client JavaScript.
 */
export function ListSearch({
  action,
  q,
  placeholder,
  className = '',
}: {
  action: string
  q: string
  placeholder: string
  className?: string
}) {
  return (
    <form method="get" action={action} className={`${card} flex flex-wrap items-end gap-3 p-4 ${className}`}>
      <div className="min-w-[240px] flex-1">
        <label htmlFor="q" className={label}>
          Search
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          className={`mt-1.5 ${input}`}
          autoComplete="off"
        />
      </div>
      <button type="submit" className={btnPrimary}>
        Search
      </button>
      {q && (
        <Link href={action} className={btnSecondary}>
          Clear
        </Link>
      )}
    </form>
  )
}
