import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoMark } from '@/components/logo-mark'
import { AdminNav } from '@/app/admin/nav'
import { logout } from '@/app/admin/actions'
import { display } from '@/lib/fonts'
import { focus } from '@/lib/ui'

const weave = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 16px), repeating-linear-gradient(-45deg, rgba(255,255,255,.04) 0 2px, transparent 2px 16px)',
}

export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (claims?.app_metadata?.role !== 'admin') {
    redirect('/admin/login')
  }

  const email = claims.email ?? ''

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <aside
          className="sticky top-0 hidden h-screen flex-col bg-ink lg:flex"
          style={weave}
        >
          <div className="px-5 py-6">
            <Link
              href="/admin"
              className={`inline-flex items-center gap-2.5 rounded-control text-white ${focus}`}
              aria-label="WorkSprout admin"
            >
              <LogoMark size={34} />
              <span className={`${display.className} text-xl font-extrabold tracking-tight`}>
                WorkSprout
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/80">
                Admin
              </span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <p className="px-3 pb-2 text-meta font-medium text-white/50">
              Console
            </p>
            <AdminNav />
          </nav>

          <div className="border-t border-white/10 p-4">
            <p className="truncate text-meta font-medium text-white/50">
              Signed in
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">{email}</p>
            <form action={logout} className="mt-3">
              <button
                className={`inline-flex w-full items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white ${focus}`}
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-line bg-canvas/85 backdrop-blur lg:hidden">
            <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
              <Link
                href="/admin"
                className={`inline-flex items-center gap-2 ${focus}`}
                aria-label="WorkSprout admin"
              >
                <LogoMark size={30} />
                <span className={`${display.className} text-lg font-extrabold tracking-tight`}>
                  Admin
                </span>
              </Link>
              <form action={logout} className="ml-auto">
                <button
                  className={`inline-flex items-center justify-center gap-2 rounded-control px-3 py-2 text-sm font-medium text-ink-2 transition-colors hover:bg-ink/5 hover:text-ink ${focus}`}
                >
                  Sign out
                </button>
              </form>
            </div>
            <div className="overflow-x-auto border-t border-line px-2">
              <AdminNav variant="bar" />
            </div>
          </header>

          <main className="w-full flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
