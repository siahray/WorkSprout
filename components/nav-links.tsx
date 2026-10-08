'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { focus } from '@/lib/ui'

const links = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-5H4v5Zm10-11h6V4h-6v5Z',
  },
  {
    href: '/focus',
    label: 'Focus',
    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-8 10 2 2 4-4',
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: 'M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 9v-1a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11',
  },
  {
    href: '/projects',
    label: 'Projects',
    icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
  },
  {
    href: '/time',
    label: 'Time',
    icon: 'M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: 'M6 2h9l5 5v15H6V2Zm8 0v5h5M9 13h6M9 17h6',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.1l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.9-1.1L14.5 3h-4l-.5 2.4a7.4 7.4 0 0 0-1.9 1.1l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.9 1.1l.5 2.4h4l.5-2.4a7.4 7.4 0 0 0 1.9-1.1l2.4 1 2-3.4-2-1.6c.1-.4.1-.7.1-1.1Z',
  },
]

export function NavLinks({ variant = 'sidebar' }: { variant?: 'sidebar' | 'bar' }) {
  const pathname = usePathname()

  return (
    <ul className={variant === 'bar' ? 'flex items-center gap-1' : 'space-y-1'}>
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${focus} ${
                active
                  ? 'bg-[#2E9E6B]/12 text-[#1F6B52]'
                  : 'text-[#0E2F27]/70 hover:bg-[#F4F8F5] hover:text-[#0E2F27]'
              } ${variant === 'bar' ? 'whitespace-nowrap' : ''}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
