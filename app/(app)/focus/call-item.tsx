'use client'

import { useTransition } from 'react'
import { ActionButton } from '@/components/ui/action-button'
import { ConfirmAction } from '@/components/ui/confirm-action'
import { callJoinUrl, type CallListItem, type CallStatus } from '@/lib/call'
import { btnSecondary, focus } from '@/lib/ui'
import { deleteCall, sendCallInvite, setCallStatus } from './actions'

function timeLabel(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })
}

function CallStatusSelect({ id, status }: { id: string; status: CallStatus }) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      aria-label="Call status"
      value={status}
      disabled={pending}
      onChange={(event) =>
        startTransition(async () => {
          await setCallStatus(id, event.target.value)
        })
      }
      className={`w-[124px] rounded-xl border border-[#0E2F27]/20 bg-white px-3 py-1.5 text-xs text-[#0E2F27] disabled:cursor-not-allowed disabled:opacity-60 ${focus}`}
    >
      <option value="scheduled">Scheduled</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    </select>
  )
}

export function CallItem({ call }: { call: CallListItem }) {
  const join = callJoinUrl(call.location)
  const cancelled = call.status === 'cancelled'

  return (
    <li className="flex flex-wrap items-start gap-3 py-3">
      <span className="w-20 shrink-0 pt-0.5 text-sm font-semibold tabular-nums text-[#0E2F27]/70">
        {timeLabel(call.scheduledAt)}
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${cancelled ? 'text-[#0E2F27]/45 line-through' : 'text-[#0E2F27]'}`}>
          {call.title}
        </p>
        <p className="mt-0.5 text-xs text-[#0E2F27]/55">
          {call.durationMinutes} min
          {call.clientName ? ` · ${call.clientName}` : ''}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {join ? (
            <a
              href={join}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[#1F6B52] underline-offset-2 hover:underline"
            >
              Join link
            </a>
          ) : (
            call.location && <span className="text-[#0E2F27]/55">{call.location}</span>
          )}
          {call.invitedAt && (
            <span className="rounded-full bg-[#2E9E6B]/12 px-2 py-0.5 font-medium text-[#1F6B52]">Invited</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {call.clientEmail && (
          <ActionButton
            action={sendCallInvite}
            id={call.id}
            className={`${btnSecondary} !px-3 !py-1.5 text-xs`}
            pendingText="Sending…"
            okClassName="text-xs font-medium text-[#1F6B52]"
          >
            Send invite
          </ActionButton>
        )}
        <CallStatusSelect id={call.id} status={call.status} />
        <ConfirmAction
          action={deleteCall}
          id={call.id}
          message="Delete this call?"
          className="rounded-lg p-2 text-[#0E2F27]/40 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <span className="sr-only">Delete</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </ConfirmAction>
      </div>
    </li>
  )
}
