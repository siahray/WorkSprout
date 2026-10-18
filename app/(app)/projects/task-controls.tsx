'use client'

import { useActionState, useEffect, useRef, useTransition, useState } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { addPhase, addSubtask, addTask, setSubtaskStatus, setTaskStatus } from './actions'
import { alertError, alertOk, btnSecondary, focus as focusRing, input } from '@/lib/ui'
import type { FormState } from '@/lib/validation'

export function AddPhaseForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(addPhase, {})

  return (
    <form action={formAction} aria-busy={pending} className="space-y-2">
      <input type="hidden" name="project_id" value={projectId} />
      <div className="flex gap-2">
        <label htmlFor="phase-title" className="sr-only">
          Phase name
        </label>
        <input
          id="phase-title"
          name="title"
          required
          placeholder="Add a phase (e.g. Phase 1)…"
          className={`${input} flex-1`}
        />
        <SubmitButton pendingText="Adding…" className={btnSecondary}>
          Add phase
        </SubmitButton>
      </div>
      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}
    </form>
  )
}

export function AddTaskForm({
  projectId,
  phaseId,
  phases = [],
}: {
  projectId: string
  phaseId?: string
  phases?: { id: string; title: string }[]
}) {
  const [state, formAction, pending] = useActionState(addTask, {})
  const showPhaseSelect = !phaseId && phases.length > 0
  const inputId = phaseId ? `task-title-${phaseId}` : 'task-title'

  return (
    <form action={formAction} aria-busy={pending} className="space-y-2">
      <input type="hidden" name="project_id" value={projectId} />
      {phaseId && <input type="hidden" name="phase_id" value={phaseId} />}
      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          Task title
        </label>
        <input id={inputId} name="title" required placeholder="Add a task…" className={`${input} flex-1`} />
        <SubmitButton pendingText="Adding…" className={btnSecondary}>
          Add
        </SubmitButton>
      </div>
      {showPhaseSelect && (
        <label className="block">
          <span className="sr-only">Phase</span>
          <select name="phase_id" defaultValue="" className={input} aria-label="Phase">
            <option value="">No phase</option>
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {state.error && (
        <p role="alert" className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}
    </form>
  )
}

export function TaskStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      aria-label="Task status"
      value={status}
      disabled={pending}
      onChange={(event) =>
        startTransition(async () => {
          await setTaskStatus(id, event.target.value)
        })
      }
      className={`rounded-xl border border-[#0E2F27]/20 bg-white px-3.5 py-1.5 text-xs text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B] w-[130px]`}
    >
      <option value="todo">To do</option>
      <option value="in_progress">In progress</option>
      <option value="done">Done</option>
    </select>
  )
}

export function AddSubtaskForm({ parentTaskId, projectId }: { parentTaskId: string; projectId: string }) {
  const [state, formAction, pending] = useActionState(addSubtask, {})

  return (
    <form action={formAction} aria-busy={pending} className='space-y-2'>
      <input type='hidden' name='parent_task_id' value={parentTaskId} />
      <input type='hidden' name='project_id' value={projectId} />
      <div className='flex gap-2'>
        <label htmlFor={`subtask-title-${parentTaskId}`} className='sr-only'>
          Subtask title
        </label>
        <input
          id={`subtask-title-${parentTaskId}`}
          name='title'
          required
          placeholder='Add a subtask…'
          className={`${input} flex-1 text-sm py-1.5`}
        />
        <SubmitButton pendingText='Adding…' className={`${btnSecondary} text-sm py-1.5 px-3`}>
          Add
        </SubmitButton>
      </div>
      {state.error && (
        <p role='alert' className={alertError}>
          {state.error}
        </p>
      )}
      {state.ok && <p className={alertOk}>{state.ok}</p>}
    </form>
  )
}

export function SubtaskStatusSelect({ id, status }: { id: string; status: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      aria-label='Subtask status'
      value={status}
      disabled={pending}
      onChange={(event) =>
        startTransition(async () => {
          await setSubtaskStatus(id, event.target.value)
        })
      }
      className={`rounded-xl border border-[#0E2F27]/20 bg-white px-2.5 py-1 text-xs text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E9E6B] w-[110px]`}
    >
      <option value='todo'>To do</option>
      <option value='in_progress'>In progress</option>
      <option value='done'>Done</option>
    </select>
  )
}

// A compact up/down control for reordering. Disabled at the ends of its group so
// the action never runs as a no-op.
export function MoveItem({
  action,
  id,
  direction,
  disabled,
  label,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  id: string
  direction: 'up' | 'down'
  disabled: boolean
  label: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const arrow = direction === 'up' ? '↑' : '↓'

  return (
    <>
      <button
        type="button"
        disabled={disabled || pending}
        aria-label={`${direction === 'up' ? 'Move up' : 'Move down'}: ${label}`}
        onClick={() => {
          const formData = new FormData()
          formData.set('id', id)
          formData.set('direction', direction)
          startTransition(async () => {
            const result = await action({}, formData)
            setError(result.error ?? null)
          })
        }}
        className={`flex h-6 w-6 items-center justify-center rounded-md text-sm leading-none text-[#0E2F27]/40 transition-colors hover:bg-[#0E2F27]/5 hover:text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-25 ${focusRing}`}
      >
        {pending ? '…' : arrow}
      </button>
      {/* The row has no room for visible text, so failures are announced but not shown. */}
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  )
}

// Inline rename: the title is a button until clicked, then becomes a focused
// input. Enter or blur saves, Escape cancels. A rename that comes back with an
// error keeps the editor open so it can be corrected.
export function InlineRename({
  action,
  id,
  value,
  label,
  className = '',
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>
  id: string
  value: string
  label: string
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  // Set when Escape closes the editor, so the following blur does not save.
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  // Every submission path (Enter, Save, blur) funnels through here. Closing on
  // success happens in this callback rather than an effect watching the result.
  function submit() {
    const title = draft.trim()
    // A blank or unchanged title just exits — no round trip.
    if (!title || title === value) {
      setEditing(false)
      return
    }
    const formData = new FormData()
    formData.set('id', id)
    formData.set('title', title)
    startTransition(async () => {
      const result = await action({}, formData)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        setEditing(false)
      }
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          cancelledRef.current = false
          setError(null)
          setDraft(value)
          setEditing(true)
        }}
        className={`group -mx-1 flex min-w-0 items-center gap-1.5 rounded-lg px-1 text-left transition-colors hover:bg-[#0E2F27]/5 ${focusRing}`}
      >
        <span className={`min-w-0 truncate ${className}`}>{value}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 text-[#0E2F27]/0 transition-colors group-hover:text-[#0E2F27]/40 group-focus-visible:text-[#0E2F27]/40"
        >
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
        <span className="sr-only">Rename {label}</span>
      </button>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex min-w-0 flex-1 items-center gap-1.5"
    >
      <input
        ref={inputRef}
        name="title"
        value={draft}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            cancelledRef.current = true
            setEditing(false)
          }
        }}
        onBlur={() => {
          // Guarded so Escape's blur cannot save; the form submit covers
          // Enter and the Save button (which swallows its own mousedown).
          if (!cancelledRef.current && !pending) submit()
        }}
        aria-label={label}
        className={`${input} flex-1 py-1 text-sm`}
      />
      <button
        type="submit"
        disabled={pending}
        onMouseDown={(event) => event.preventDefault()}
        className={`inline-flex items-center justify-center gap-1 rounded-lg border border-[#0E2F27]/15 bg-white px-2.5 py-1 text-xs font-semibold text-[#0E2F27] transition-colors hover:border-[#0E2F27]/25 hover:bg-[#F4F8F5] disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
      >
        {pending ? '…' : 'Save'}
      </button>
      {error && (
        <span role="alert" className="whitespace-nowrap text-xs font-medium text-red-700">
          {error}
        </span>
      )}
    </form>
  )
}
