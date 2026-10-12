'use client'

import { useActionState, useTransition } from 'react'
import { SubmitButton } from '@/components/ui/submit-button'
import { addPhase, addSubtask, addTask, setSubtaskStatus, setTaskStatus } from './actions'
import { alertError, alertOk, btnSecondary, input } from '@/lib/ui'

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
