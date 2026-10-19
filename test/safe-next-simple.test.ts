import { test, expect } from 'bun:test'
import { safeNextPath } from '../lib/safe-next'

test('safeNextPath keeps an in-app path', () => {
  expect(safeNextPath('/reset-password', '/dashboard')).toBe('/reset-password')
  expect(safeNextPath('/invoices?page=2', '/dashboard')).toBe('/invoices?page=2')
})

test('safeNextPath rejects anything that could leave the site', () => {
  expect(safeNextPath('//evil.example.com', '/dashboard')).toBe('/dashboard')
  expect(safeNextPath('/\\evil.example.com', '/dashboard')).toBe('/dashboard')
  expect(safeNextPath('https://evil.example.com', '/dashboard')).toBe('/dashboard')
  expect(safeNextPath('reset-password', '/dashboard')).toBe('/dashboard')
})

test('safeNextPath falls back when the link names no path', () => {
  expect(safeNextPath(null, '/reset-password')).toBe('/reset-password')
  expect(safeNextPath('', '/reset-password')).toBe('/reset-password')
  expect(safeNextPath(undefined, '/reset-password')).toBe('/reset-password')
})
