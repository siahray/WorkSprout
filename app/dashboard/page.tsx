import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { body, display } from '@/lib/fonts'
import { Logo } from '@/components/logo'
import { logout } from './actions'

export const metadata: Metadata = {
  title: 'Dashboard · WorkSprout',
  robots: { index: false, follow: false },
}

const focus =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B]'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', claims.sub)
    .maybeSingle()

  const name = profile?.full_name

  return (
    <div className={`${body.className} min-h-screen bg-[#F4F8F5] text-[#0E2F27]`}>
      <header className="border-b border-[#0E2F27]/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Logo />
          <form action={logout}>
            <button
              type="submit"
              className={`rounded-lg px-3 py-2 text-sm font-medium text-[#0E2F27]/70 hover:text-[#0E2F27] ${focus}`}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-[#0E2F27]/12 bg-white p-8 shadow-[0_18px_40px_-24px_rgba(14,47,39,0.35)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#2E9E6B]/15">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 13l4 4L19 7" stroke="#2E9E6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className={`${display.className} text-center text-3xl font-extrabold tracking-tight`}>
            {name ? `Welcome, ${name}` : 'Welcome to WorkSprout'}
          </h1>
          <p className="mt-2 text-center text-[#0E2F27]/70">
            You&rsquo;re signed in as <span className="font-semibold text-[#0E2F27]">{claims.email}</span>
          </p>
          <p className="mx-auto mt-4 max-w-md text-center text-sm text-[#0E2F27]/60">
            The workspace is still being built — clients, tasks, hours, and invoices are coming soon. Your
            beta account is ready for it.
          </p>
        </div>
      </main>
    </div>
  )
}
