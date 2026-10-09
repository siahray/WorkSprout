'use client'

import { useState, type ReactNode } from 'react'
import { focus } from '@/lib/ui'

const TABS = [
  { key: 'todos', label: 'To-dos' },
  { key: 'deliverables', label: 'Deliverables' },
] as const

export function FocusTabs({
  dayTotal,
  deliverableCount,
  stats,
  calendar,
  todoSidebar,
  todoList,
  deliverablesList,
}: {
  dayTotal: number
  deliverableCount: number
  stats: ReactNode
  calendar: ReactNode
  todoSidebar: ReactNode
  todoList: ReactNode
  deliverablesList: ReactNode
}) {
  const [view, setView] = useState<'todos' | 'deliverables'>('todos')

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-full bg-[#F4F8F5] p-1">
        {TABS.map((tab) => {
          const count = tab.key === 'todos' ? dayTotal : deliverableCount
          const active = view === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              aria-pressed={active}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${focus} ${
                active ? 'bg-white text-[#0E2F27] shadow-sm' : 'text-[#0E2F27]/60 hover:text-[#0E2F27]'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 tabular-nums ${active ? 'text-[#1F6B52]' : 'text-[#0E2F27]/45'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {view === 'todos' ? (
        <div className="space-y-6">
          {stats}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
            {calendar}
            {todoSidebar}
          </div>
          {todoList}
        </div>
      ) : (
        <div className="space-y-6">
          {calendar}
          {deliverablesList}
        </div>
      )}
    </div>
  )
}
