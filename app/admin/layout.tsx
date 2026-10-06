import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { body } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Admin · WorkSprout',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={`${body.className} min-h-screen bg-[#F4F8F5] text-[#0E2F27]`}>{children}</div>
}
