// Page-by-page collection for export routes.
//
// List pages render one 50-row slice at a time; an export has to hand over
// every matching row, so this walks the query in pages until a short page
// says the data has run out. The fetcher is a plain function of inclusive
// [from, to] bounds, which keeps this testable with a stub and lets each
// route build its own filtered query without sharing Supabase types.

const PAGE_SIZE = 1000

// A safety stop: if a buggy fetcher keeps returning full pages forever, bail
// loudly (null = 500 in the route) instead of looping — and never silently
// hand back a truncated file.
const MAX_ROWS = 50_000

type PageResult = { data: unknown; error: { message: string } | null }

export async function fetchAll<T>(
  fetchRange: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<T[] | null> {
  const all: T[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await fetchRange(from, from + PAGE_SIZE - 1)
    if (error) return null
    const rows = (data ?? []) as T[]
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
  return null
}
