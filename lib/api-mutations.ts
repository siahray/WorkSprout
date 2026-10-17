// Shared write logic for the things external tools create: clients and
// appointments (calls).
//
// Both the server actions and the integration API call these, so the rules —
// which fields are required, what ranges are allowed, and the ownership check on
// a referenced client — are stated once. Duplicating them in the API would let
// the two paths drift, which is the failure this whole layer exists to prevent.
//
// The caller supplies the database client and the owning user id. The actions
// pass their session client (where RLS also applies); the API passes the
// service-role client, which BYPASSES RLS and therefore depends entirely on the
// explicit `user_id` values set here.

import type { SupabaseClient } from '@supabase/supabase-js'
import { isEmail, isUuid } from '@/lib/validation'

export type WriteResult<T> =
  | { ok: true; value: T }
  // `status` is only meaningful to the API layer; the actions show the message.
  | { ok: false; status: number; error: string }

function optionalString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text.length ? text : null
}

// --- Clients -----------------------------------------------------------------

export type ClientInput = {
  name?: unknown
  company?: unknown
  email?: unknown
  address?: unknown
  tax_id?: unknown
  notes?: unknown
}

export async function createClientRecord(
  supabase: SupabaseClient,
  userId: string,
  input: ClientInput,
): Promise<WriteResult<{ id: string }>> {
  const name = optionalString(input.name)
  const email = optionalString(input.email)

  if (!name) return { ok: false, status: 400, error: 'Client name is required.' }
  if (email && !isEmail(email)) {
    return { ok: false, status: 400, error: 'Enter a valid email address, or leave it blank.' }
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name,
      company: optionalString(input.company),
      email,
      address: optionalString(input.address),
      tax_id: optionalString(input.tax_id),
      notes: optionalString(input.notes),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('create client failed:', error?.message)
    return { ok: false, status: 500, error: 'Could not save the client — please try again.' }
  }

  return { ok: true, value: { id: data.id as string } }
}

// --- Calls (appointments) ----------------------------------------------------

export type CallInput = {
  title?: unknown
  client_id?: unknown
  /** ISO 8601 instant. Stored UTC; the app renders it in Asia/Manila. */
  scheduled_at?: unknown
  duration_minutes?: unknown
  location?: unknown
  notes?: unknown
}

const DEFAULT_DURATION_MINUTES = 30

export async function scheduleCall(
  supabase: SupabaseClient,
  userId: string,
  input: CallInput,
): Promise<WriteResult<{ id: string }>> {
  const title = optionalString(input.title)
  if (!title) return { ok: false, status: 400, error: 'Give the call a title.' }
  if (title.length > 200) {
    return { ok: false, status: 400, error: 'Keep the title under 200 characters.' }
  }

  const scheduledAt = optionalString(input.scheduled_at)
  if (!scheduledAt) {
    return { ok: false, status: 400, error: 'Provide the start time as an ISO 8601 timestamp.' }
  }
  const when = new Date(scheduledAt)
  if (Number.isNaN(when.getTime())) {
    return { ok: false, status: 400, error: 'That start time could not be read — use an ISO 8601 timestamp.' }
  }

  // `??` rather than `||`, so an explicitly empty value from the form still
  // fails the range check instead of silently becoming the default.
  const rawDuration = input.duration_minutes ?? DEFAULT_DURATION_MINUTES
  const duration = Number(rawDuration)
  if (!Number.isFinite(duration) || duration < 1 || duration > 1440) {
    return { ok: false, status: 400, error: 'Pick a duration between 1 minute and 24 hours.' }
  }

  const clientId = optionalString(input.client_id)
  if (clientId) {
    if (!isUuid(clientId)) return { ok: false, status: 400, error: 'That client could not be found.' }
    // Scoped to the owner, so a caller cannot attach an appointment to someone
    // else's client by guessing an id.
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', clientId)
      .eq('user_id', userId)
      .maybeSingle()
    if (!client) return { ok: false, status: 400, error: 'That client could not be found.' }
  }

  const { data, error } = await supabase
    .from('calls')
    .insert({
      user_id: userId,
      client_id: clientId ?? null,
      title,
      scheduled_at: when.toISOString(),
      duration_minutes: Math.round(duration),
      location: optionalString(input.location),
      notes: optionalString(input.notes),
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('create call failed:', error?.message)
    return { ok: false, status: 500, error: 'Could not schedule the call — please try again.' }
  }

  return { ok: true, value: { id: data.id as string } }
}
