import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth-shell'
import { Logo } from '@/components/logo'
import { display } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Check your email · WorkSprout',
  robots: { index: false, follow: false },
}

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

const delay = (n: number) => ({ animationDelay: `${150 + n * 90}ms` })

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const email = typeof params.email === 'string' ? params.email : ''

  return (
    <AuthShell heading="Almost there." text="One click on the link in your email and you're in.">
      <div className="mx-auto w-full max-w-md px-6">
        <div className="ws-rise mb-8" style={delay(0)}>
          <Link href="/" className={`inline-block rounded-lg ${focus}`}>
            <Logo />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 text-center shadow-[0_24px_50px_-28px_rgba(14,47,39,0.45)]">
          <svg viewBox="0 0 96 72" className="mx-auto h-20 w-24" aria-hidden="true">
            <path
              d="M10 8h76a4 4 0 0 1 4 4v48a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4z"
              pathLength={1}
              fill="none"
              stroke="#0E2F27"
              strokeWidth="3"
              strokeLinejoin="round"
              className="ws-draw"
            />
            <path
              d="M8 12l40 28 40-28"
              pathLength={1}
              fill="none"
              stroke="#2E9E6B"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ws-draw"
              style={{ animationDelay: '700ms' }}
            />
            <g className="ws-leaf" style={{ transformOrigin: '50% 50%', animationDelay: '1.3s' }}>
              <circle cx="86" cy="10" r="10" fill="#F4B63F" />
              <path d="M81 10l3.5 3.5L91 6.5" fill="none" stroke="#0E2F27" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>

          <div className="ws-rise" style={delay(2)}>
            <h1 className={`${display.className} mt-5 text-3xl font-extrabold tracking-tight`}>Check your inbox</h1>
            <p className="mt-3 leading-relaxed text-[#0E2F27]/70">
              {email ? (
                <>
                  We sent a confirmation link to <strong className="break-all text-[#0E2F27]">{email}</strong>.
                </>
              ) : (
                'We sent you a confirmation link.'
              )}{' '}
              Click it to finish setting up your account.
            </p>
          </div>

          <p
            className="ws-rise mt-5 rounded-lg bg-[#F4F8F5] px-4 py-3 text-sm text-[#0E2F27]/70"
            style={delay(3)}
          >
            Can&apos;t find it? Check your spam or promotions folder. It can take a minute or two to arrive.
          </p>

          <div className="ws-rise mt-7 space-y-3" style={delay(4)}>
            <Link
              href="/login"
              className={`block w-full rounded-xl bg-[#F4B63F] px-5 py-3.5 font-semibold text-[#0E2F27] transition-colors hover:bg-[#e9a82a] ${focus}`}
            >
              Go to log in
            </Link>
            <Link
              href="/signup"
              className={`block rounded-lg text-sm font-semibold text-[#1F6B52] hover:underline ${focus}`}
            >
              Use a different email
            </Link>
          </div>
        </div>
      </div>
    </AuthShell>
  )
}