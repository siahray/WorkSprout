/**
 * Status reads as a quiet chip: a tinted wash, a dot, and the word. The word is
 * always there, so colour is a second signal rather than the only one — which
 * is also what makes it work for anyone who cannot separate the two greens.
 *
 * Meaning is fixed: canvas = inert, mango = waiting on someone, sprout = done,
 * danger = void. A status that is not in this list renders as inert.
 */
const styles: Record<string, string> = {
  // invoice (derived)
  draft: 'bg-canvas text-ink-2',
  sent: 'bg-mango-wash text-mango-deep',
  partial: 'bg-mango-wash text-mango-deep',
  paid: 'bg-sprout-wash text-sprout-deep',
  void: 'bg-danger-wash text-danger',
  // project / task
  active: 'bg-sprout-wash text-sprout-deep',
  completed: 'bg-canvas text-ink-2',
  on_hold: 'bg-mango-wash text-mango-deep',
  archived: 'bg-canvas text-ink-2',
  todo: 'bg-canvas text-ink-2',
  in_progress: 'bg-mango-wash text-mango-deep',
  done: 'bg-sprout-wash text-sprout-deep',
}

const dots: Record<string, string> = {
  draft: 'bg-ink-4',
  sent: 'bg-mango',
  partial: 'bg-mango',
  paid: 'bg-sprout',
  void: 'bg-danger',
  active: 'bg-sprout',
  completed: 'bg-ink-4',
  on_hold: 'bg-mango',
  archived: 'bg-ink-4',
  todo: 'bg-ink-4',
  in_progress: 'bg-mango',
  done: 'bg-sprout',
}

export function StatusBadge({ status }: { status: string }) {
  const className = styles[status] ?? 'bg-canvas text-ink-2'
  const dot = dots[status] ?? 'bg-ink-4'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-meta font-semibold capitalize ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden="true" />
      {status.replace(/_/g, ' ')}
    </span>
  )
}
