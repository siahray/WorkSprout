const styles: Record<string, string> = {
  // invoice (derived)
  draft: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  sent: 'bg-[#F4B63F]/20 text-[#8a6412]',
  partial: 'bg-[#F4B63F]/20 text-[#8a6412]',
  paid: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
  void: 'bg-red-100 text-red-700',
  // project / task
  active: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
  completed: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  on_hold: 'bg-[#F4B63F]/20 text-[#8a6412]',
  archived: 'bg-[#0E2F27]/8 text-[#0E2F27]/55',
  todo: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  in_progress: 'bg-[#F4B63F]/20 text-[#8a6412]',
  done: 'bg-[#2E9E6B]/12 text-[#1F6B52]',
}

const dots: Record<string, string> = {
  draft: 'bg-[#0E2F27]/40',
  sent: 'bg-[#c98a16]',
  partial: 'bg-[#c98a16]',
  paid: 'bg-[#2E9E6B]',
  void: 'bg-red-500',
  active: 'bg-[#2E9E6B]',
  completed: 'bg-[#0E2F27]/40',
  on_hold: 'bg-[#c98a16]',
  archived: 'bg-[#0E2F27]/35',
  todo: 'bg-[#0E2F27]/40',
  in_progress: 'bg-[#c98a16]',
  done: 'bg-[#2E9E6B]',
}

export function StatusBadge({ status }: { status: string }) {
  const className = styles[status] ?? 'bg-[#0E2F27]/8 text-[#0E2F27]/70'
  const dot = dots[status] ?? 'bg-[#0E2F27]/40'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {status.replace(/_/g, ' ')}
    </span>
  )
}
