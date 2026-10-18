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
  formSubmissions?: {
    /** Starting rows, keyed `${user_id}:${key}`. */
    rows?: Map<string, Row>
    insertError?: { code?: string; message: string } | null
    updateError?: { code?: string; message: string } | null
    deleteError?: { code?: string; message: string } | null
  }
} = {}) {
  const idem = opts.idempotency
  const clients = opts.clients
  const forms = opts.formSubmissions
  // Stateful, so a test can claim a key, store a response, and replay it for
  // real rather than reading back a scripted reply.
  const formRows = forms?.rows ?? new Map<string, Row>()
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
      if (table === 'form_submissions') {
        const matches = (row: Row, userId: unknown, key: unknown) =>
          row.user_id === userId && row.key === key

        return {
          insert: (values: Row) => {
            log.push('form.insert')
            if (forms?.insertError) return { error: forms.insertError }
            const id = `${values.user_id}:${values.key}`
            if (formRows.has(id)) {
              // Mirrors the unique (user_id, key) constraint.
              return { error: { code: '23505', message: 'duplicate key value' } }
            }
            formRows.set(id, { ...values, response: null })
            return { error: null }
          },
          select: () => ({
            eq: (col1: string, v1: unknown) => ({
              eq: (col2: string, v2: unknown) => ({
                maybeSingle: async () => {
                  const row = [...formRows.values()].find((r) =>
                    matches(r, col1 === 'user_id' ? v1 : v2, col1 === 'user_id' ? v2 : v1),
                  )
                  return { data: row ?? null, error: null }
                },
              }),
            }),
          }),
          update: (values: Row) => ({
            eq: (col1: string, v1: unknown) => ({
              eq: (col2: string, v2: unknown) => {
                log.push('form.update')
                if (forms?.updateError) return { error: forms.updateError }
                const row = [...formRows.entries()].find(([, r]) =>
                  matches(r, col1 === 'user_id' ? v1 : v2, col1 === 'user_id' ? v2 : v1),
                )
                if (row) Object.assign(row[1], values)
                return { error: null }
              },
            }),
          }),
          delete: () => ({
            eq: (col1: string, v1: unknown) => ({
              eq: (col2: string, v2: unknown) => {
                log.push('form.delete')
                if (forms?.deleteError) return { error: forms.deleteError }
                for (const [id, r] of formRows.entries()) {
                  if (matches(r, col1 === 'user_id' ? v1 : v2, col1 === 'user_id' ? v2 : v1)) {
                    formRows.delete(id)
                  }
                }
                return { error: null }
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
