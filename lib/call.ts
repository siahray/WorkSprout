// Scheduled calls with clients. Times are stored as UTC and presented in
// Asia/Manila, which is a fixed UTC+8 (no DST), so wall-clock math is simple.

import type { SupabaseClient } from '@supabase/supabase-js'

export type CallStatus = 'scheduled' | 'completed' | 'cancelled'

export const CALL_STATUSES: CallStatus[] = ['scheduled', 'completed', 'cancelled']

export function isCallStatus(value: unknown): value is CallStatus {
  return value === 'scheduled' || value === 'completed' || value === 'cancelled'
}

// A call as listed in Focus, with the client's display name resolved.
export type CallListItem = {
  id: string
  title: string
  scheduledAt: string
  durationMinutes: number
  location: string | null
  notes: string | null
  status: CallStatus
  clientId: string | null
  clientName: string | null
  clientEmail: string | null
  invitedAt: string | null
  invitedTo: string | null
  publicToken: string
}

// Everything needed to render an invitation (owner view and public view).
export type CallSnapshot = {
  id: string
  title: string
  scheduledAt: string
  durationMinutes: number
  location: string | null
  notes: string | null
  status: CallStatus
  publicToken: string
  invitedAt: string | null
  invitedTo: string | null
  client: { name: string; company: string | null; email: string | null } | null
  business: { name: string; email: string | null; phone: string | null }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

// Maps a Manila wall-clock date + time to the UTC instant stored in `scheduled_at`.
export function manilaToIso(date: string, time: string): string | null {
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null
  const parsed = new Date(`${date}T${time}:00+08:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

// "Mon, Oct 14, 2026 · 2:00 PM – 2:30 PM PHT" (Manila time).
export function callWhen(scheduledAt: string, durationMinutes: number): string {
  const start = new Date(scheduledAt)
  if (Number.isNaN(start.getTime())) return '—'
  const end = new Date(start.getTime() + Math.max(1, durationMinutes) * 60_000)
  const date = start.toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  })
  const time = (value: Date) =>
    value.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
  return `${date} · ${time(start)} – ${time(end)} PHT`
}

// The Manila calendar day (YYYY-MM-DD) a call falls on, for grouping by day.
export function callManilaDate(scheduledAt: string): string {
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
}

// A meeting link, when the location looks like one.
export function callJoinUrl(location: string | null): string | null {
  if (!location) return null
  const trimmed = location.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : null
}

// The iCalendar invite for a call. Loaded lazily so the Buffer-based iCalendar
// builder never reaches the client bundle.
export async function callIcs(call: CallSnapshot, link: string | null): Promise<string> {
  const { buildIcs } = await import('@/lib/ics')
  const start = new Date(call.scheduledAt)
  const end = new Date(start.getTime() + Math.max(1, call.durationMinutes) * 60_000)
  const description = [call.notes, link ? `Details: ${link}` : null].filter(Boolean).join('\n\n')
  return buildIcs({
    uid: `${call.publicToken || call.id}@worksprout`,
    title: call.title,
    description: description || null,
    start,
    end,
    location: call.location,
    url: link,
    organizerName: call.business.name,
    organizerEmail: call.business.email ?? undefined,
    attendeeName: call.client?.name ?? undefined,
    attendeeEmail: call.client?.email ?? undefined,
  })
}

type Embedded = { name: string; email?: string | null } | { name: string; email?: string | null }[] | null

export type CallRow = {
  id: string
  title: string
  scheduled_at: string
  duration_minutes: number | string
  location: string | null
  notes: string | null
  status: CallStatus
  client_id: string | null
  invited_at: string | null
  invited_to: string | null
  public_token: string
  client?: Embedded
}

function clientField(value: Embedded, key: 'name' | 'email'): string | null {
  if (!value) return null
  const entry = Array.isArray(value) ? value[0] : value
  const raw = entry?.[key]
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

export function mapCallRow(row: CallRow): CallListItem {
  return {
    id: row.id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    durationMinutes: Number(row.duration_minutes) || 0,
    location: row.location,
    notes: row.notes,
    status: row.status,
    clientId: row.client_id,
    clientName: clientField(row.client ?? null, 'name'),
    clientEmail: clientField(row.client ?? null, 'email'),
    invitedAt: row.invited_at,
    invitedTo: row.invited_to,
    publicToken: row.public_token,
  }
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function fetchCallSnapshot(
  db: SupabaseClient,
  id: string,
  userId: string,
): Promise<CallSnapshot | null> {
  const { data: call } = await db.from('calls').select('*').eq('id', id).maybeSingle()
  if (!call) return null

  const clientPromise = call.client_id
    ? db.from('clients').select('name, company, email').eq('id', call.client_id).maybeSingle()
    : Promise.resolve({ data: null })

  const [clientRes, profileRes] = await Promise.all([
    clientPromise,
    db.from('profiles').select('business_name, full_name, business_phone, email').eq('id', userId).maybeSingle(),
  ])

  const client = clientRes.data
  const profile = profileRes.data

  return {
    id: call.id,
    title: call.title,
    scheduledAt: call.scheduled_at,
    durationMinutes: Number(call.duration_minutes) || 0,
    location: call.location,
    notes: call.notes,
    status: call.status as CallStatus,
    publicToken: call.public_token,
    invitedAt: call.invited_at,
    invitedTo: call.invited_to,
    client: client
      ? { name: client.name, company: str(client.company), email: str(client.email) }
      : null,
    business: {
      name: str(profile?.business_name) ?? str(profile?.full_name) ?? 'Your business',
      email: str(profile?.email),
      phone: str(profile?.business_phone),
    },
  }
}

type PublicCallPayload = {
  call: {
    title: string
    scheduled_at: string
    duration_minutes: unknown
    location: string | null
    notes: string | null
    status: string
  }
  client: { name: string | null; company: string | null; email: string | null } | null
  business: {
    business_name: string | null
    full_name: string | null
    business_phone: string | null
    email: string | null
  }
}

export function snapshotFromPublicCall(payload: unknown): CallSnapshot | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as PublicCallPayload
  if (!p.call || !p.business) return null

  return {
    id: '',
    title: p.call.title,
    scheduledAt: p.call.scheduled_at,
    durationMinutes: Number(p.call.duration_minutes) || 0,
    location: str(p.call.location),
    notes: str(p.call.notes),
    status: isCallStatus(p.call.status) ? p.call.status : 'scheduled',
    publicToken: '',
    invitedAt: null,
    invitedTo: null,
    client: p.client
      ? { name: p.client.name ?? '', company: str(p.client.company), email: str(p.client.email) }
      : null,
    business: {
      name: str(p.business.business_name) ?? str(p.business.full_name) ?? 'Your business',
      email: str(p.business.email),
      phone: str(p.business.business_phone),
    },
  }
}
