// Minimal RFC 5545 (iCalendar) builder for a single call invite. Enough for
// Google/Apple/Outlook to add the event from an email attachment.

export type IcsInput = {
  uid: string
  title: string
  description?: string | null
  start: Date
  end: Date
  location?: string | null
  url?: string | null
  organizerName?: string | null
  organizerEmail?: string | null
  attendeeName?: string | null
  attendeeEmail?: string | null
  status?: 'CONFIRMED' | 'CANCELLED'
}

function formatUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

// Escape text values per RFC 5545 §3.3.11.
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// Content lines are limited to 75 octets; longer lines fold with CRLF + space.
function fold(line: string): string {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = Buffer.byteLength(char, 'utf8')
    // Continuation lines carry a leading space, which also counts toward 75.
    const limit = parts.length === 0 ? 74 : 73
    if (bytes + size > limit) {
      parts.push(current)
      current = ` ${char}`
      bytes = 1 + size
    } else {
      current += char
      bytes += size
    }
  }
  parts.push(current)
  return parts.join('\r\n')
}

export function buildIcs(input: IcsInput): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorkSprout//Calls//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${esc(input.uid)}`,
    `DTSTAMP:${formatUtc(new Date())}`,
    `DTSTART:${formatUtc(input.start)}`,
    `DTEND:${formatUtc(input.end)}`,
    `SUMMARY:${esc(input.title)}`,
    input.description ? `DESCRIPTION:${esc(input.description)}` : '',
    input.location ? `LOCATION:${esc(input.location)}` : '',
    input.url ? `URL:${esc(input.url)}` : '',
    input.organizerEmail
      ? `ORGANIZER;CN=${esc(input.organizerName ?? input.organizerEmail)}:mailto:${input.organizerEmail}`
      : '',
    input.attendeeEmail
      ? `ATTENDEE;CN=${esc(input.attendeeName ?? input.attendeeEmail)};RSVP=TRUE:mailto:${input.attendeeEmail}`
      : '',
    `STATUS:${input.status ?? 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((line) => line !== '')

  return `${lines.map(fold).join('\r\n')}\r\n`
}
