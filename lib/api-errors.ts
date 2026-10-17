// Maps a shared-mutation failure onto an API response body.
//
// The mutations return a human-readable message plus the HTTP status that fits;
// the API additionally needs a stable machine-readable code, because a caller's
// retry logic keys off `error`, not the prose.

const CODES: Record<number, string> = {
  400: 'invalid_request',
  404: 'not_found',
  409: 'conflict',
}

export function writeError(status: number, message: string): { status: number; body: unknown } {
  return { status, body: { error: CODES[status] ?? 'write_failed', message } }
}
