'use client'

import { useState } from 'react'
import { ActionButton } from '@/components/ui/action-button'
import { ConfirmAction } from '@/components/ui/confirm-action'
import type { FormState } from '@/lib/validation'

export type TodoItemData = {
  id: string
  title: string
  completed_at: string | null
  project: { id: string; name: string } | null
}

export function TodoItem({
  todo,
  toggleAction,
  deleteAction,
}: {
  todo: TodoItemData
  toggleAction: (state: FormState, formData: FormData) => Promise<FormState>
  deleteAction: (state: FormState, formData: FormData) => Promise<FormState>
}) {
  const done = Boolean(todo.completed_at)

  // The check only pops for a tick the *person* made. Keyed purely off `done`,
  // every already-completed to-do would pop at once on page load — motion
  // nobody asked for. `armed` is set by the click that started the change, so
  // the pop lands when the server's `done` arrives (arming on click rather
  // than diffing `done` also means ticking and unticking can't be confused).
  const [armed, setArmed] = useState(false)

  return (
    <li className="flex items-center gap-3 py-2.5" onClick={() => setArmed(!done)}>
      <ActionButton
        action={toggleAction}
        id={todo.id}
        pendingText="…"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm leading-none transition-colors ${
          done
            ? 'border-sprout bg-sprout text-white'
            : 'border-ink-4 text-transparent hover:border-sprout'
        }`}
      >
        <span className="sr-only">{done ? 'Mark as not done' : 'Mark as done'}</span>
        <span
          className={armed && done ? 'animate-pop' : undefined}
          onAnimationEnd={() => setArmed(false)}
          aria-hidden="true"
        >
          {done ? '✓' : '○'}
        </span>
      </ActionButton>

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          done ? 'text-ink-3 line-through' : 'text-ink'
        }`}
      >
        {todo.title}
      </span>

      {todo.project && (
        <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-2">
          {todo.project.name}
        </span>
      )}

      <ConfirmAction
        action={deleteAction}
        id={todo.id}
        message="Delete this to-do?"
        className="shrink-0 rounded-control p-2 text-ink-4 transition-colors hover:bg-danger-wash hover:text-danger"
      >
        <span className="sr-only">Delete</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </ConfirmAction>
    </li>
  )
}