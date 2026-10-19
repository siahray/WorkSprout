// Only ever hand a link back to an in-app path. A leading "/" that is not "//"
// (which browsers read as a protocol-relative URL to another host) is the whole
// test; "/\" is rejected too, because browsers normalise the backslash to a
// slash. Deliberately free of server-only imports — the confirm page runs this
// in the browser.
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next?.startsWith('/')) return fallback
  if (next.startsWith('//') || next.startsWith('/\\')) return fallback
  return next
}
