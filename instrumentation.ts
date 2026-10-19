import type { Instrumentation } from 'next'
import { logError } from '@/lib/log'

// Next.js calls this for every *server* error that escapes normal handling:
// route handlers, server actions, RSC renders, and the proxy. Failures that
// are caught and converted to error responses already log at their call site
// through `logError`; this catches the ones that would otherwise only reach
// Next's default stderr output.
//
// Signature: node_modules/next/dist/docs/01-app/03-api-reference/
// 03-file-conventions/instrumentation.md
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  // React replaces some errors before they get here; `digest` identifies the
  // original failure when the message was stripped.
  const digest =
    typeof error === 'object' && error !== null && 'digest' in error
      ? String(error.digest)
      : undefined

  logError('unhandled request error', {
    error,
    digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
  })
}
