import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeSearch } from '@/lib/search'
import { csvResponse, toCsv } from '@/lib/csv'
import { fetchAll } from '@/lib/export'

const HEADER = ['date', 'description', 'note', 'category', 'project', 'amount']

type ExpenseRow = {
  description: string
  note: string | null
  category: string
  amount: number | string
  spent_on: string
  project: { name: string } | null
}

/**
 * CSV of every expense matching the list's ?q= search — the same rows the
 * table shows, without the 50-row page cap. Session required, so the file
 * only ever leaves with its owner's own data.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return new Response('Unauthorized', { status: 401 })

  const q = sanitizeSearch(request.nextUrl.searchParams.get('q') ?? undefined)

  const rows = await fetchAll<ExpenseRow>((from, to) => {
    const query = supabase
      .from('expenses')
      .select('description, note, category, amount, spent_on, project:projects(name)')
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false })
    const matching = q
      ? query.or(`description.ilike.%${q}%,note.ilike.%${q}%,category.ilike.%${q}%`)
      : query
    return matching.range(from, to)
  })
  if (!rows) return new Response('Failed to load expenses', { status: 500 })

  const body = toCsv(
    HEADER,
    rows.map((row) => [
      row.spent_on,
      row.description,
      row.note,
      row.category,
      row.project?.name ?? 'Overhead',
      row.amount,
    ]),
  )
  return csvResponse(body, 'worksprout-expenses')
}
