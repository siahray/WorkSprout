'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { focus } from '@/lib/ui'

const links = [
  {
    href: '/admin',
    label: 'Signups',
    exact: true,
    icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z',
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 9v-1a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: 'M3 3v18h18M7 16v-5M12 16V8M17 16v-9',
  },
  {
    href: '/admin/broadcast',
    label: 'Broadcast',
    icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z',
  },
  {
    href: '/admin/feedback',
    label: 'Feedback',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  },
  {
    href: '/admin/activity',
    label: 'Activity',
    icon: 'M22 12h-4l-3 9L9 3l-3 9H2',
  },
]

export function AdminNav({ variant = 'sidebar' }: { variant?: 'sidebar' | 'bar' }) {
  const pathname = usePathname()
  const bar = variant === 'bar'

  return (
    <ul className={bar ? 'flex items-center gap-1' : 'space-y-1'}>
      {links.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)
        const tone = bar
          ? active
            ? 'bg-sprout/12 text-sprout-deep'
            : 'text-ink-2 hover:bg-canvas hover:text-ink'
          : active
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:bg-white/5 hover:text-white'
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors ${focus} ${tone} ${
                bar ? 'whitespace-nowrap py-2' : ''
              }`}
            >
              {!bar && active && (
                <span
                  className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-mango"
                  aria-hidden="true"
                />
              )}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={link.icon} />
              </svg>
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
