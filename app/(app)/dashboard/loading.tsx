import { Skeleton } from '@/components/ui/skeleton'
import { card } from '@/lib/ui'

/**
 * The dashboard's own skeleton, so the landing route keeps the ledger strip and
 * the panel grid rather than falling back to the generic list shape.
 */
export default function DashboardLoading() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading</span>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-3 h-4 w-72 max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-11 w-32 rounded-control" />
          <Skeleton className="h-11 w-24 rounded-control" />
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-panel px-5 py-4">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="mt-2.5 h-8 w-32" />
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-10">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={`${card} p-5 lg:col-span-1`}>
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 space-y-3.5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className={`${card} overflow-hidden lg:col-span-2`}>
            <div className="border-b border-line px-5 py-3.5">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="divide-y divide-line">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-4 w-32 shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
