// API key generation and hashing for the integration API.
//
// A key is 32 random bytes rendered as hex, prefixed so it is recognisable in
// logs and can be caught by secret scanners. Only the SHA-256 hash is stored:
// there is no low-entropy secret here to brute force, so a slow key-derivation
// function would add latency to every request without adding security.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const API_KEY_PREFIX = 'wsp_live_'

export type GeneratedApiKey = {
  /** Shown to the user once. Never stored. */
  raw: string
  /** Stored in `api_keys.key_hash`. */
  hash: string
  /** Stored in `api_keys.prefix`, for recognising the key later. */
  prefix: string
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(32).toString('hex')
  const raw = `${API_KEY_PREFIX}${secret}`
  // Enough to identify the key, not enough to reconstruct it.
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, API_KEY_PREFIX.length + 6) }
}

/** Cheap shape check before hitting the database. */
export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(API_KEY_PREFIX) && value.length === API_KEY_PREFIX.length + 64
}

/** Constant-time compare, for callers that already hold a candidate hash. */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}
