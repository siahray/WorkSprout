import { display } from '@/lib/fonts'
import { LogoMark } from '@/components/logo-mark'

export function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span
        className={`${display.className} font-extrabold tracking-tight`}
        style={{ fontSize: size * 0.7, lineHeight: 1 }}
      >
        WorkSprout
      </span>
    </span>
  )
}
