import Link from 'next/link'
import { card, focus } from '@/lib/ui'
import { display } from '@/lib/fonts'

// One day in the grid. `href` links to that day's list; `status` drives the
// achievement dot (green = every to-do on that day is done).
export type CalendarCell = {
  day: number
  iso: string
  href: string
  status: 'none' | 'partial' | 'won'
  isToday: boolean
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Calendar({
  label,
  prevHref,
  nextHref,
  cells,
}: {
  label: string
  prevHref: string
  nextHref: string
  cells: (CalendarCell | null)[]
}) {
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-center justify-between">
        <Link
          href={prevHref}
          aria-label="Previous month"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#0E2F27]/60 transition-colors hover:bg-[#F4F8F5] hover:text-[#0E2F27] ${focus}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h2 className={`${display.className} text-center text-base font-bold tracking-tight`}>{label}</h2>
        <Link
          href={nextHref}
          aria-label="Next month"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-[#0E2F27]/60 transition-colors hover:bg-[#F4F8F5] hover:text-[#0E2F27] ${focus}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#0E2F27]/45">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="pb-1">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) =>
          cell ? (
            <Link
              key={cell.iso}
              href={cell.href}
              aria-label={cell.iso}
              className={`group flex flex-col items-center gap-0.5 rounded-lg py-1 transition-colors ${focus} ${
                cell.isToday ? 'bg-[#2E9E6B]/12 text-[#1F6B52]' : 'text-[#0E2F27]/80 hover:bg-[#F4F8F5]'
              }`}
            >
              <span className="text-sm tabular-nums">{cell.day}</span>
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${
                  cell.status === 'won'
                    ? 'bg-[#2E9E6B]'
                    : cell.status === 'partial'
                      ? 'bg-[#2E9E6B]/40'
                      : 'bg-transparent'
                }`}
              />
            </Link>
          ) : (
            <span key={`empty-${i}`} />
          ),
        )}
      </div>
    </section>
  )
}