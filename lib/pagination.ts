// Page math for the paginated list pages.
//
// Lists that grow without bound (invoices, expenses, time entries) fetch one
// page of rows at a time with PostgREST's .range(), which is inclusive on both
// ends, while a head-only count on the same query gives the total for the
// "Page x of y" footer. Everything here is pure so the edge cases around bad
// URLs and out-of-range pages are pinned by tests instead of being clicked.

export const PAGE_SIZE = 50

/** A ?page= value arrives as untrusted text; anything unusable means page 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const first = Array.isArray(raw) ? raw[0] : raw
  const page = Number.parseInt(first ?? '', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

/** Inclusive [from, to] bounds for Supabase's .range(). */
export function pageRange(page: number, size = PAGE_SIZE): { from: number; to: number } {
  const from = (page - 1) * size
  return { from, to: from + size - 1 }
}

/** Total pages for a row count — at least one, so page 1 always exists. */
export function pageCount(total: number, size = PAGE_SIZE): number {
  if (total <= 0) return 1
  return Math.ceil(total / size)
}

/**
 * Squeeze a requested page into the real range. Used to redirect ?page=999
 * down to the last page that actually exists instead of rendering an empty
 * table under a "Page 999 of 12" heading.
 */
export function clampedPage(page: number, pages: number): number {
  return Math.min(Math.max(page, 1), Math.max(pages, 1))
}

/**
 * Link for a list page, carrying the current filters (search text, project
 * filter) and the target page. Page 1 is left out of the query string so the
 * canonical URL for the first page stays clean, and empty values are dropped
 * so a cleared search doesn't reappear as ?q=.
 */
export function listHref(
  basePath: string,
  params: Record<string, string | undefined>,
  page: number,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (key !== 'page' && value) search.set(key, value)
  }
  if (page > 1) search.set('page', String(page))
  const query = search.toString()
  return query ? `${basePath}?${query}` : basePath
}
