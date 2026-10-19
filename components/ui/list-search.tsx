import Link from 'next/link'
import { btnPrimary, btnSecondary, input } from '@/lib/ui'

/**
 * GET-form search box for a list page. Submitting replaces the query string,
 * which deliberately drops any ?page= — a new search starts back at page 1.
 * Server-rendered, so it needs no client JavaScript.
 *
 * No panel around it: the input is the container, and a card drawn around a
 * single field just adds an edge to look at.
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
    <form method="get" action={action} className={`flex flex-wrap items-center gap-2 ${className}`}>
      <input
        id="q"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${input} max-w-md`}
        autoComplete="off"
      />
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
