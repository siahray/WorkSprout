'use client'

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

  return (
    <li className="flex items-center gap-3 py-2.5">
      <ActionButton
        action={toggleAction}
        id={todo.id}
        pendingText="…"
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm leading-none transition-colors ${
          done
            ? 'border-[#2E9E6B] bg-[#2E9E6B] text-white'
            : 'border-[#0E2F27]/30 text-transparent hover:border-[#2E9E6B]'
        }`}
      >
        <span className="sr-only">{done ? 'Mark as not done' : 'Mark as done'}</span>
        {done ? '✓' : '○'}
      </ActionButton>

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          done ? 'text-[#0E2F27]/45 line-through' : 'text-[#0E2F27]'
        }`}
      >
        {todo.title}
      </span>

      {todo.project && (
        <span className="shrink-0 rounded-full bg-[#F4F8F5] px-2 py-0.5 text-xs font-medium text-[#0E2F27]/60">
          {todo.project.name}
        </span>
      )}

      <ConfirmAction
        action={deleteAction}
        id={todo.id}
        message="Delete this to-do?"
        className="shrink-0 rounded-lg p-2 text-[#0E2F27]/40 transition-colors hover:bg-red-50 hover:text-red-700"
      >
        <span className="sr-only">Delete</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        </svg>
      </ConfirmAction>
    </li>
  )
}