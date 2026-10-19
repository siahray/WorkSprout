// Structured, single-line JSON logging for server code.
//
// Every failure path logs through `logError` so the log viewer (Vercel, or
// any future drain) can filter and group on `level`/`event` instead of us
// grepping free-form strings. Values are normalized defensively: Errors
// become `{ message, name, stack }`, Supabase errors (plain objects) are
// JSON round-tripped, and anything unserializable falls back to String().

export type LogContext = Record<string, unknown>

// Keys the formatter owns; a context cannot spoof them.
const RESERVED_KEYS = ['level', 'event']

function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Error) {
    const out: Record<string, unknown> = { message: value.message, name: value.name }
    if (value.stack) out.stack = value.stack
    return out
  }
  if (typeof value === 'object') {
    try {
      // PostgrestError and friends are plain objects; this keeps code/details.
      return JSON.parse(JSON.stringify(value))
    } catch {
      return String(value)
    }
  }
  return String(value)
}

// Pure: returns one line of JSON, newlines inside values included (escaped).
export function formatLogRecord(
  level: 'error' | 'warn' | 'info',
  event: string,
  context?: LogContext
): string {
  const fields: Record<string, unknown> = {}
  if (context) {
    for (const [key, value] of Object.entries(context)) {
      if (RESERVED_KEYS.includes(key)) continue
      const normalized = normalizeValue(value)
      if (normalized !== undefined) fields[key] = normalized
    }
  }
  return JSON.stringify({ ...fields, level, event })
}

export function logError(event: string, context?: LogContext): void {
  console.error(formatLogRecord('error', event, context))
}
