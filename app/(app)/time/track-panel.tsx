'use client'

import { useState } from 'react'
import { StartTimer, type ProjectOption } from './timer-controls'
import { TimeEntryForm } from './entry-form'
import type { FormState } from '@/lib/validation'
import { card, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

const TABS = [
  { key: 'timer', label: 'Timer' },
  { key: 'manual', label: 'Manual' },
] as const

export function TrackPanel({
  projects,
  initialProjectId,
  hasRunning,
  manualAction,
}: {
  projects: ProjectOption[]
  initialProjectId?: string
  hasRunning: boolean
  manualAction: (state: FormState, formData: FormData) => Promise<FormState>
}) {
  const [tab, setTab] = useState<'timer' | 'manual'>('timer')

  return (
    <section className={`${card} p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={`${display.className} text-lg font-bold tracking-tight`}>Track time</h2>
        <div className="inline-flex rounded-full bg-[#F4F8F5] p-1">
          {TABS.map((item) => {
            const active = tab === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                aria-pressed={active}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${focus} ${
                  active ? 'bg-white text-[#0E2F27] shadow-sm' : 'text-[#0E2F27]/60 hover:text-[#0E2F27]'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 max-w-2xl">
        {tab === 'timer' ? (
          <StartTimer
            projects={projects}
            initialProjectId={initialProjectId}
            hasRunning={hasRunning}
            bare
          />
        ) : (
          <TimeEntryForm action={manualAction} projects={projects} cancelHref="/time" bare />
        )}
      </div>
    </section>
  )
}
