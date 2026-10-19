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
      <p className="truncate text-body font-semibold text-white">{name || email}</p>
      <p className="truncate text-meta text-white/45">{email}</p>
      <Link
        href="/feedback"
        onClick={onNavigate}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-control bg-mango px-3 py-2 text-small font-semibold text-ink transition-colors hover:bg-mango/90 active:translate-y-px ${focus}`}
      >
        Send feedback
      </Link>
      <form action={logout} className="mt-1">
        <button
          className={`inline-flex w-full items-center justify-center gap-2 rounded-control px-3 py-2 text-small font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white ${focus}`}
        >
          Sign out
        </button>
      </form>
    </>
  )
}
