import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * One-time keys for the app's own mutations, backing `addPayment` and
 * `createInvoice`.
 *
 * This is deliberately not a wrapper around the whole action. `createInvoice`
 * ends in `redirect()`, which throws `NEXT_REDIRECT` and — per the Next.js
 * docs — must be called outside any try/catch. A wrapper that caught every
 * exception would swallow it. So the action claims, runs, and completes, and
 * keeps its own redirect.
 *
 * The API's `idempotency_keys` cannot be reused here: that table is RLS
 * deny-all so only the service-role client reaches it, and app actions have a
 * session, not a service role.
 */

export type FormClaim =
  /** First time we have seen this key: run the mutation. */
  | { kind: 'claimed' }
  /** The first attempt finished. Return this instead of writing again. */
  | { kind: 'replay'; response: unknown }
  /**
   * The first attempt is still running. We cannot honestly report success — we
   * do not know the outcome yet — so this is surfaced as a calm error rather
   * than a false confirmation. Rare in practice: `SubmitButton` already
   * disables itself while `pending`, so this only catches a network-level
   * retry racing the original request.
   */
  | { kind: 'in_progress' }

const MAX_KEY_LENGTH = 200

/**
 * Claims `key` for this user, or reports what already happened to it.
 *
 * An absent or oversized key is treated as "no key": the mutation simply runs.
 * The key is a courtesy, not a requirement, so a form that predates this
 * mechanism keeps working.
 */
export async function claimFormSubmission(
  supabase: SupabaseClient,
  userId: string,
  key: string,
): Promise<FormClaim> {
  const trimmed = key.trim()
  if (!trimmed || trimmed.length > MAX_KEY_LENGTH) return { kind: 'claimed' }

  const { error } = await supabase
    .from('form_submissions')
    .insert({ user_id: userId, key: trimmed })

  if (!error) return { kind: 'claimed' }

  // Anything other than "already exists" means we could not record the claim,
  // so we cannot guarantee a single write — let the mutation run rather than
  // silently dropping the user's payment.
  if (error.code !== '23505') {
    console.error('form submission claim failed:', error.message)
    return { kind: 'claimed' }
  }

  const { data } = await supabase
    .from('form_submissions')
    .select('response')
    .eq('user_id', userId)
    .eq('key', trimmed)
    .maybeSingle()

  if (!data) {
    // The row vanished between the conflict and this read (pruned, or deleted
    // by a failing first attempt). Nothing was recorded, so run again.
    return { kind: 'claimed' }
  }

  return data.response == null
    ? { kind: 'in_progress' }
    : { kind: 'replay', response: data.response }
}

/** Records what a replay of this key should return. */
export async function storeFormResponse(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  response: unknown,
): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed || trimmed.length > MAX_KEY_LENGTH) return

  const { error } = await supabase
    .from('form_submissions')
    .update({ response })
    .eq('user_id', userId)
    .eq('key', trimmed)

  // A failed store only weakens replay; the write itself already happened.
  if (error) console.error('form submission store failed:', error.message)
}

/**
 * Gives the key back after a failed attempt, so the same form can be corrected
 * and resubmitted. Without this, a validation error arriving *after* the claim
 * would burn the key and lock the user out of their own form.
 */
export async function releaseFormClaim(
  supabase: SupabaseClient,
  userId: string,
  key: string,
): Promise<void> {
  const trimmed = key.trim()
  if (!trimmed || trimmed.length > MAX_KEY_LENGTH) return

  const { error } = await supabase
    .from('form_submissions')
    .delete()
    .eq('user_id', userId)
    .eq('key', trimmed)

  if (error) console.error('form submission release failed:', error.message)
}
