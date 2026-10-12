export function ProgressBar({
  done,
  total,
  className,
}: {
  done: number
  total: number
  className?: string
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${done} of ${total} tasks done`}
        className="h-1.5 overflow-hidden rounded-full bg-[#0E2F27]/10"
      >
        <div
          className="h-full rounded-full bg-[#2E9E6B] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs text-[#0E2F27]/55">
        {total === 0 ? 'No tasks yet' : `${done} of ${total} tasks · ${percent}%`}
      </p>
    </div>
  )
}