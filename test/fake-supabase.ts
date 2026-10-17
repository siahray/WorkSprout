import type { SupabaseClient } from '@supabase/supabase-js'

export type Row = Record<string, unknown>

export function createFakeSupabase(opts: {
  idempotency?: {
    rows?: Map<string, Row>
    insertError?: { code?: string; message?: string } | null
    updateError?: { code?: string; message?: string } | null
  }
  clients?: {
    insert?: unknown
    maybeSingleByIdAndUser?: unknown
  }
} = {}) {
  const idem = opts.idempotency
  const clients = opts.clients
  const log: Array<string> = []

  const supabase = {
    from(table: string) {
      if (table === 'idempotency_keys') {
        return {
          insert: () => {
            log.push('insert')
            return { error: idem?.insertError ?? null }
          },
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  const rows = idem?.rows
                  if (!rows) return { data: null, error: null }
                  for (const r of rows.values()) {
                    if (r.user_id && r.key) return { data: r, error: null }
                  }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => {
                log.push('update')
                return { error: idem?.updateError ?? null }
              },
            }),
          }),
        }
      }
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  return clients?.maybeSingleByIdAndUser ?? { data: null, error: null }
                },
              }),
            }),
          }),
        }
      }
      return {
        insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
        update: () => ({ eq: () => ({ eq: () => ({ error: null }) }) }),
      }
    },
  } as unknown as SupabaseClient

  return { supabase, log }
}
