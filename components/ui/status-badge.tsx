const styles: Record<string, string> = {
  // invoice (derived)
  draft: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  sent: 'bg-[#F4B63F]/25 text-[#8a6412]',
  partial: 'bg-[#F4B63F]/25 text-[#8a6412]',
  paid: 'bg-[#2E9E6B]/15 text-[#1F6B52]',
  void: 'bg-red-100 text-red-700',
  // project / task
  active: 'bg-[#2E9E6B]/15 text-[#1F6B52]',
  completed: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  on_hold: 'bg-[#F4B63F]/25 text-[#8a6412]',
  archived: 'bg-[#0E2F27]/8 text-[#0E2F27]/60',
  todo: 'bg-[#0E2F27]/8 text-[#0E2F27]/70',
  in_progress: 'bg-[#F4B63F]/25 text-[#8a6412]',
  done: 'bg-[#2E9E6B]/15 text-[#1F6B52]',
}

export function StatusBadge({ status }: { status: string }) {
  const className = styles[status] ?? 'bg-[#0E2F27]/8 text-[#0E2F27]/70'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
