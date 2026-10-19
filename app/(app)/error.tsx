'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { display } from '@/lib/fonts'
import { btnPrimary, btnSecondary, card, focus } from '@/lib/ui'

/**
 * The workspace error boundary. A failed render should not look like a broken
 * product: it says what happened, offers the one useful action, and keeps the
 * frame around it. `retry` re-renders the segment — this version of Next passes
 * `retry` rather than the older `reset`.
 */
export default function WorkspaceError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className={`${card} mx-auto mt-4 max-w-xl p-8 text-center`}>
      <h1 className={`${display.className} text-title font-extrabold tracking-tight text-ink`}>
        That page didn&apos;t load
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-body text-ink-2">
        Something went wrong on our side. Nothing you saved is affected — try again, and if it keeps
        happening we&apos;re on it.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={() => retry()} className={`${btnPrimary} ${focus}`}>
          Try again
        </button>
        <Link href="/dashboard" className={`${btnSecondary} ${focus}`}>
          Back to dashboard
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-meta text-ink-4">Reference {error.digest}</p>}
    </div>
  )
}
