import Link from 'next/link'

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

// The one place an unusable emailed link is explained: the reset page when no
// session came with the link, and the confirm page when the link was already
// used or has expired. Same words, same way out.
export function LinkExpiredCard() {
  return (
    <div className="mx-auto w-full max-w-md px-6">
      <div className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 text-center shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]">
        <h1 className="text-2xl font-extrabold tracking-tight">This link has expired</h1>
        <p className="mt-2 text-[#0E2F27]/65">
          Email links work once and don&rsquo;t last forever. Request a fresh one and we&rsquo;ll email it over.
        </p>
        <Link
          href="/forgot-password"
          className={`mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-[#F4B63F] px-5 py-3.5 text-base font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] ${focus}`}
        >
          Send a new link
        </Link>
      </div>
    </div>
  )
}
