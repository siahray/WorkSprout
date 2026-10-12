// Taxes a user charges (e.g. VAT, percentage tax, a service fee). Stored as a
// JSON array of { label, rate } on the profile, then snapshotted onto invoices.

export type Tax = { label: string; rate: number }

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Best-effort read of a jsonb value coming back from the database. Invalid
// entries are dropped; rates are clamped to (0, 100].
export function coerceTaxes(value: unknown): Tax[] {
  if (!Array.isArray(value)) return []
  const out: Tax[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const label = typeof (entry as { label?: unknown }).label === 'string' ? (entry as { label: string }).label.trim() : ''
    const rate = Number((entry as { rate?: unknown }).rate)
    if (!label || !Number.isFinite(rate) || rate <= 0 || rate > 100) continue
    out.push({ label: label.slice(0, 60), rate: round2(rate) })
    if (out.length >= 12) break
  }
  return out
}

// Each tax applies to the subtotal independently. Amounts are rounded per tax
// so the invoice total always matches the sum of the displayed lines.
export function taxLines(subtotal: number, taxes: Tax[]): { label: string; rate: number; amount: number }[] {
  return taxes.map((tax) => ({ ...tax, amount: round2((subtotal * tax.rate) / 100) }))
}

export function taxTotal(subtotal: number, taxes: Tax[]): number {
  return round2(taxLines(subtotal, taxes).reduce((sum, line) => sum + line.amount, 0))
}
