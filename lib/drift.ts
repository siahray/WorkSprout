// Local-vs-remote Supabase migration comparison, as emitted by
// `supabase migration list --output-format json`: paired entries carry the
// same version on both sides, drift shows up as an empty or mismatched side.
// Consumed by scripts/check-drift.ts (CI: .github/workflows/drift.yml).

export type MigrationEntry = {
  local?: string | null
  remote?: string | null
  time?: string
}

export type DriftSummary = {
  synced: number
  localOnly: string[]
  remoteOnly: string[]
  mismatched: Array<{ local: string; remote: string }>
}

export function summarizeDrift(entries: MigrationEntry[]): DriftSummary {
  const summary: DriftSummary = { synced: 0, localOnly: [], remoteOnly: [], mismatched: [] }
  for (const entry of entries) {
    const local = entry.local || ''
    const remote = entry.remote || ''
    if (local && remote) {
      if (local === remote) summary.synced += 1
      else summary.mismatched.push({ local, remote })
    } else if (local) {
      summary.localOnly.push(local)
    } else if (remote) {
      summary.remoteOnly.push(remote)
    }
  }
  return summary
}
