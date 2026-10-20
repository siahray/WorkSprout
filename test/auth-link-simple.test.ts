import { test, expect } from 'bun:test'
import { shouldCarryAuthHash, linkDestination, readableAuthLinkError, CARRIED_LINK_TYPES } from '../lib/auth-link-shared'

// The invite and reset emails are sent from our own Resend config now, via
// `generateLink`. That call only ever preserves a *bare origin* in
// `redirect_to` — ask for `https://host/auth/confirm?next=…` and it hands back
// `https://host` — so the session always lands at the site root and something
// has to forward it. If the type is not in this list, the invitee sits on the
// marketing page holding a session nothing claims.

test('every link type the app can send is forwarded', () => {
  expect(CARRIED_LINK_TYPES).toContain('recovery')
  // The one that was missing: `generateLink({type:'invite'})` labels its
  // verification URL `type=invite`, not `magiclink`.
  expect(CARRIED_LINK_TYPES).toContain('invite')
  expect(CARRIED_LINK_TYPES).toContain('magiclink')
  expect(CARRIED_LINK_TYPES).toContain('signup')
})

test('an invite hash is carried', () => {
  const hash = new URLSearchParams('type=invite&access_token=abc&refresh_token=def')
  expect(shouldCarryAuthHash(hash)).toBe(true)
})

test('a recovery hash is carried', () => {
  expect(shouldCarryAuthHash(new URLSearchParams('type=recovery&access_token=abc'))).toBe(true)
})

test('a refusal is carried even though it names no type', () => {
  expect(shouldCarryAuthHash(new URLSearchParams('error=access_denied&error_code=otp_expired'))).toBe(true)
  expect(shouldCarryAuthHash(new URLSearchParams('error_code=otp_expired'))).toBe(true)
  expect(shouldCarryAuthHash(new URLSearchParams('error=access_denied'))).toBe(true)
})

test('an unrelated hash is left exactly where it was', () => {
  expect(shouldCarryAuthHash(new URLSearchParams('type=something_else'))).toBe(false)
  expect(shouldCarryAuthHash(new URLSearchParams('access_token=abc'))).toBe(false)
  expect(shouldCarryAuthHash(new URLSearchParams(''))).toBe(false)
})

test('a forwarded link defaults to the password page', () => {
  // Both an invite and a reset want /reset-password: set one, or choose a new
  // one. Neither carries its own `next`, because Supabase strips it.
  expect(linkDestination(null)).toBe('/reset-password')
  expect(linkDestination(undefined)).toBe('/reset-password')
  expect(linkDestination('')).toBe('/reset-password')
})

test('a forwarded link keeps an in-app destination', () => {
  expect(linkDestination('/dashboard')).toBe('/dashboard')
  expect(linkDestination('/reset-password')).toBe('/reset-password')
})

test('a forwarded link cannot be pointed off-site', () => {
  expect(linkDestination('//evil.example.com')).toBe('/reset-password')
  expect(linkDestination('/\\evil.example.com')).toBe('/reset-password')
  expect(linkDestination('https://evil.example.com')).toBe('/reset-password')
})

test('Supabase errors are rewritten for a person to read', () => {
  expect(readableAuthLinkError('email rate limit exceeded')).toMatch(/wait a few minutes/i)
  expect(readableAuthLinkError('User already registered')).toMatch(/already has an account/i)
  expect(readableAuthLinkError('User not found')).toMatch(/could not send/i)
  expect(readableAuthLinkError('some unexpected internal failure')).toMatch(/try again/i)
})
