// Small, dependency-free form helpers. Inputs are always treated as untrusted.

export type FormState = { error?: string; ok?: string }

export function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim()
}

export function optionalText(formData: FormData, key: string): string | null {
  const value = text(formData, key)
  return value.length ? value : null
}

// Parse a money amount, tolerating thousands separators and a leading ₱/P.
export function money(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/[₱,\s]/g, '').replace(/^p/i, '')
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

// Parse a quantity (e.g. hours or units), rounded to 2 places.
export function quantity(formData: FormData, key: string): number | null {
  const raw = text(formData, key).replace(/,/g, '')
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}
