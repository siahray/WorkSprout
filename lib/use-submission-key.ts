'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A one-time key identifying a single *intent* to submit, not a single mount.
 *
 * Two constraints pull against each other here, and both are load-bearing:
 *
 * 1. **The key cannot exist during SSR.** A random value minted on the server
 *    cannot match the one minted on the client, so the first paint would
 *    mismatch and React would warn. Minting in an effect also means the value
 *    survives a reload as a *new* key — deterministic ids like `useId()` do
 *    not, which would make a second payment after a reload collide with the
 *    first.
 *
 * 2. **The key must rotate after every success.** `PaymentForm` is rendered
 *    inline on the invoice page and stays mounted, so a "one key per mount"
 *    rule would let payment #1 consume the key and then silently swallow
 *    payment #2 as a duplicate — a real money loss, not a cosmetic bug.
 *
 * Until the effect runs the key is empty, and the server treats an empty key
 * as "no key": the mutation simply runs. A user cannot submit faster than
 * React can mount.
 */
export function useSubmissionKey(succeeded: boolean): string {
  const [key, setKey] = useState('')
  const mounted = useRef(false)

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      setKey(crypto.randomUUID())
    }
  }, [])

  const rotate = useCallback(() => setKey(crypto.randomUUID()), [])

  // Rotating in an effect rather than during render keeps the new key out of
  // the commit that carries the success message, so the two stay in step.
  const previous = useRef(succeeded)
  useEffect(() => {
    if (succeeded && !previous.current) rotate()
    previous.current = succeeded
  }, [succeeded, rotate])

  return key
}
