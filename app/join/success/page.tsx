import type { Metadata } from 'next'
import Link from 'next/link'
import { body, display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: "You're on the list · WorkSprout",
  robots: { index: false, follow: false },
}

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export default async function JoinSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''

  return (
    <div className={`${body.className} flex min-h-screen items-center justify-center bg-[#F4F8F5] px-6 text-[#0E2F27]`}>
      <div className="w-full max-w-md rounded-2xl border border-[#0E2F27]/12 bg-white p-8 text-center shadow-[0_18px_40px_-24px_rgba(14,47,39,0.35)]">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#2E9E6B]/15">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="#2E9E6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 className={`${display.className} text-2xl font-extrabold tracking-tight`}>You&rsquo;re on the list</h1>
        <p className="mt-2 text-[#0E2F27]/70">
          Thanks for signing up{email ? (
            <>
              , <span className="font-semibold text-[#0E2F27]">{email}</span>
            </>
          ) : ''}
          . We&rsquo;ll reach out with your beta invite soon.
        </p>

        <Link
          href="/"
          className={`mt-6 inline-block rounded-xl bg-[#0E2F27] px-5 py-3 font-semibold text-white hover:bg-[#1F6B52] ${focus}`}
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
