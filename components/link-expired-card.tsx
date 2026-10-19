import Link from 'next/link'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sprout'

// The one place an unusable emailed link is explained: the reset page when no
// session came with the link, and the confirm page when the link was already
// used or has expired. Same words, same way out.
export function LinkExpiredCard() {
  return (
    <div className="mx-auto w-full max-w-md px-6">
      <div className="rounded-panel border border-line bg-panel p-8 text-center shadow-overlay">
        <h1 className="text-2xl font-extrabold tracking-tight">This link has expired</h1>
        <p className="mt-2 text-ink-2">
          Email links work once and don&rsquo;t last forever. Request a fresh one and we&rsquo;ll email it over.
        </p>
        <Link
          href="/forgot-password"
          className={`mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-control bg-mango px-5 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-mango-strong ${focus}`}
        >
          Send a new link
        </Link>
      </div>
    </div>
  )
}
