'use client'

import { btnSecondary, focus } from '@/lib/ui'

export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnSecondary} ${focus} print:hidden`}>
      {label}
    </button>
  )
}
