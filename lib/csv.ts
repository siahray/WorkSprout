// CSV serialisation shared by every export route.
//
// RFC 4180 in one direction only: we never parse CSV, we only produce it.
// A cell is quoted whenever it contains a comma, quote, or newline — the
// characters that would otherwise break a spreadsheet import — and embedded
// quotes are doubled. Values render as-is: nulls and undefined become empty
// cells, numbers keep their plain decimal form (never a ₱ sign, so the file
// stays machine-readable).

export function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Whole table as CSV text: one header line, then one line per row. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(',')]
  for (const row of rows) lines.push(row.map(csvCell).join(','))
  return lines.join('\n')
}

/** Content headers for a CSV download, with a dated working filename. */
export function csvResponse(body: string, filenamePrefix: string): Response {
  const date = new Date().toISOString().slice(0, 10)
  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filenamePrefix}-${date}.csv"`,
    },
  })
}
