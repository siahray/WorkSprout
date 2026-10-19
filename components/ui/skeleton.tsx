import { card } from '@/lib/ui'

/**
 * Placeholder fill for route-level loading states.
 *
 * The fill is the hairline colour, not a faded ink, so a loading screen belongs
 * to the same system as the screen it turns into. The pulse is the only motion,
 * and it stops for anyone who asked for less.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-chip bg-line motion-reduce:animate-none ${className}`}
    />
  )
}

/**
 * The shape most pages share: a page header, then a panel of hairline rows.
 * Standing in for that shape is what makes navigation feel instant — the frame
 * is already right, so the content lands in place instead of replacing it.
 */
export function SkeletonPage({ rows = 6, actions = 2 }: { rows?: number; actions?: number }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>
        {actions > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: actions }, (_, i) => (
              <Skeleton key={i} className={`h-11 rounded-control ${i === 0 ? 'w-32' : 'w-24'}`} />
            ))}
          </div>
        )}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="divide-y divide-line">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-32 shrink-0" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-24 shrink-0 sm:block" />
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
