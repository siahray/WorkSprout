const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

// Currency is fixed to PHP for the beta.
export function peso(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n === null || n === undefined || Number.isNaN(n)) return pesoFormatter.format(0)
  return pesoFormatter.format(n)
}

export function hoursFromMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes < 0) return '0h 00m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${String(m).padStart(2, '0')}m`
}

// Minutes as a decimal number of hours, rounded to 2 places (for invoice lines).
export function decimalHours(minutes: number | null | undefined): number {
  if (!minutes || minutes < 0) return 0
  return Math.round((minutes / 60) * 100) / 100
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Manila' })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  })
}

// `today` in the en-CA format (YYYY-MM-DD) matches what <input type="date"> expects.
export function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

// `HH:MM` (24-hour) in Asia/Manila, matching <input type="time">.
export function toTimeInput(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Manila' })
}

export function nowDateInput(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

export function formatPercent(rate: number | string | null | undefined): string {
  const n = typeof rate === 'string' ? Number(rate) : rate
  if (n === null || n === undefined || Number.isNaN(n)) return '0%'
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace(/\.?0+$/, '')}%`
}
