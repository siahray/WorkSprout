import { display } from '@/lib/fonts'

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0E2F27" />
        <path d="M16 25V15" stroke="#F4B63F" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 16c0-4.5-3-7-7.5-7 0 4.5 3 7 7.5 7z" fill="#2E9E6B" />
        <path d="M16 14c0-4 2.5-6.5 7.5-6.5 0 4-2.5 6.5-7.5 6.5z" fill="#F4B63F" />
      </svg>
      <span className={`${display.className} text-2xl font-extrabold tracking-tight`}>WorkSprout</span>
    </span>
  )
}
