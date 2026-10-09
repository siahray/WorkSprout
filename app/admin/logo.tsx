import { display } from '@/lib/fonts'
import { LogoMark } from '@/components/logo-mark'

export function AdminLogo({ badge = true }: { badge?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={30} />
      <span className={`${display.className} text-xl font-extrabold tracking-tight`}>WorkSprout</span>
      {badge && (
        <span className="rounded-full bg-[#0E2F27] px-2.5 py-0.5 text-xs font-semibold text-white">Admin</span>
      )}
    </span>
  )
}
