'use client'

import { useState, type ReactNode } from 'react'
import { focus } from '@/lib/ui'

const TABS = [
  { key: 'todos', label: 'To-dos' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'calls', label: 'Calls' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function FocusTabs({
  dayTotal,
  deliverableCount,
  callCount,
  stats,
  calendar,
  todoSidebar,
  todoList,
  deliverablesList,
  callSidebar,
  callList,
}: {
  dayTotal: number
  deliverableCount: number
  callCount: number
  stats: ReactNode
  calendar: ReactNode
  todoSidebar: ReactNode
  todoList: ReactNode
  deliverablesList: ReactNode
  callSidebar: ReactNode
  callList: ReactNode
}) {
  const [view, setView] = useState<TabKey>('todos')

  const counts: Record<TabKey, number> = {
    todos: dayTotal,
    deliverables: deliverableCount,
    calls: callCount,
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full bg-canvas p-1">
        {TABS.map((tab) => {
          const active = view === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-pressed={active}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${focus} ${
                active ? 'bg-panel text-ink shadow-panel' : 'text-ink-2 hover:text-ink'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 tabular-nums ${active ? 'text-sprout-deep' : 'text-ink-3'}`}>
                {counts[tab.key]}
              </span>
            </button>
          )
        })}
      </div>

      {view === 'todos' && (
        <div className="space-y-6">
          {stats}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            {calendar}
            {todoSidebar}
          </div>
          {todoList}
        </div>
      )}

      {view === 'deliverables' && (
        <div className="space-y-6">
          {calendar}
          {deliverablesList}
        </div>
      )}

      {view === 'calls' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            <div className="space-y-6">
              {calendar}
              {callList}
            </div>
            {callSidebar}
          </div>
        </div>
      )}
    </div>
  )
}
