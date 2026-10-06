import { display } from '@/lib/fonts'

export function AdminLogo({ badge = true }: { badge?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0E2F27" />
        <path d="M16 25V15" stroke="#F4B63F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 16c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z" fill="#2E9E6B" />
        <path d="M16 14c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" fill="#F4B63F" />
      </svg>
      <span className={`${display.className} text-xl font-extrabold tracking-tight`}>WorkSprout</span>
      {badge && (
        <span className="rounded-full bg-[#0E2F27] px-2.5 py-0.5 text-xs font-semibold text-white">Admin</span>
      )}
    </span>
  )
}
