import type { ReactNode } from 'react'
import { label as labelCls } from '@/lib/ui'

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-[#0E2F27]/55">{hint}</p>}
    </div>
  )
}
