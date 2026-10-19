import Link from 'next/link'
import { logout } from '@/app/(app)/actions'
import { focus } from '@/lib/ui'

// The dark-sidebar footer: identity, the mango feedback CTA, and sign out.
// Shared by the desktop sidebar and the mobile drawer so the two can't drift.
// `onNavigate` lets the drawer dismiss itself after the link is followed.
export function NavFooter({
  email,
  name,
  onNavigate,
}: {
  email: string
  name: string
  onNavigate?: () => void
}) {
  return (
    <>
      <p className="truncate text-sm font-semibold text-white">{name || email}</p>
      <p className="truncate text-xs text-white/50">{email}</p>
      <Link
        href="/feedback"
        onClick={onNavigate}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#F4B63F] px-3 py-2 text-sm font-semibold text-[#0E2F27] transition-colors hover:bg-[#f5c15e] active:translate-y-px ${focus}`}
      >
        Send feedback
      </Link>
      <form action={logout} className="mt-1">
        <button
          className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white ${focus}`}
        >
          Sign out
        </button>
      </form>
    </>
  )
}
