'use client'

import { btnSecondary, focus } from '@/lib/ui'

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${btnSecondary} ${focus} print:hidden`}>
      Print / Save as PDF
    </button>
  )
}
