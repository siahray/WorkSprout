import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { Logo } from '@/components/logo'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: "You're on the list · WorkSprout",
  robots: { index: false, follow: false },
}

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

const next = [
  'You are on the beta list.',
  'We review requests and invite testers by email.',
  'Your invite email has a one-time code to create your account.',
]

export default async function JoinSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''

  return (
    <AuthShell heading="Welcome to the beta." text="Thanks for joining. Your seat is saved.">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="ws-rise mb-8" style={delay(0)}>
          <Link href="/" className={`inline-block rounded-lg ${focus}`}>
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 text-center shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]">
          <svg viewBox="0 0 56 56" className="mx-auto h-16 w-16" aria-hidden="true">
            <circle
              className="ws-leaf"
              cx="28"
              cy="28"
              r="26"
              fill="#2E9E6B"
              fillOpacity=".15"
              style={{ transformOrigin: '50% 50%', animationDelay: '0ms' }}
            />
            <path
              d="M28 4a24 24 0 1 1 0 48a24 24 0 1 1 0-48"
              pathLength={1}
              fill="none"
              stroke="#2E9E6B"
              strokeWidth="3"
              strokeLinecap="round"
              className="ws-draw"
            />
            <path
              d="M17 29l8 8 14-16"
              pathLength={1}
              fill="none"
              stroke="#0E2F27"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ws-draw"
              style={{ animationDelay: '800ms' }}
            />
          </svg>

          <div className="ws-rise" style={delay(2)}>
            <h1 className={`${display.className} mt-5 text-3xl font-extrabold tracking-tight`}>
              You&rsquo;re on the list
            </h1>
            <p className="mt-3 leading-relaxed text-[#0E2F27]/70">
              Thanks for signing up
              {email ? (
                <>
                  , <strong className="break-all text-[#0E2F27]">{email}</strong>
                </>
              ) : null}
              . We&rsquo;ll reach out with your beta invite soon.
            </p>
          </div>

          <ol className="ws-rise mt-6 space-y-3 text-left" style={delay(3)}>
            {next.map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-sm text-[#0E2F27]/80">
                <span
                  className={`${display.className} flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0E2F27] text-xs font-semibold text-white`}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <div className="ws-rise mt-7" style={delay(4)}>
            <Link
              href="/"
              className={`block w-full rounded-xl bg-[#F4B63F] px-5 py-3.5 font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] ${focus}`}
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}