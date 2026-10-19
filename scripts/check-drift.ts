// Fails when the migration directory and the remote Supabase history
// disagree — a migration applied by hand in the dashboard, or a local file
// that was never pushed. Pure comparison logic lives in lib/drift.ts.
//
// Usage:
//   bunx supabase migration list --output-format json > /tmp/migrations.json
//   bun scripts/check-drift.ts /tmp/migrations.json
//
// CI runs this via .github/workflows/drift.yml; see docs/operations.md.

import { readFileSync } from 'node:fs'
import { summarizeDrift, type MigrationEntry } from '../lib/drift'

const path = process.argv[2]
if (!path) {
  console.error('usage: bun scripts/check-drift.ts <migration-list.json>')
  process.exit(2)
}

const text = readFileSync(path, 'utf8')
let parsed: { migrations?: MigrationEntry[] }
try {
  parsed = JSON.parse(text)
} catch {
  console.error(`not valid JSON: ${path}`)
  process.exit(2)
}

const summary = summarizeDrift(parsed.migrations ?? [])
const drift = summary.localOnly.length + summary.remoteOnly.length + summary.mismatched.length

if (drift > 0) {
  for (const version of summary.localOnly) {
    console.error(`local-only migration: ${version} (file exists here but was never applied remotely)`)
  }
  for (const version of summary.remoteOnly) {
    console.error(`remote-only migration: ${version} (applied remotely but no local file — someone edited the database directly?)`)
  }
  for (const pair of summary.mismatched) {
    console.error(`mismatched pair: local ${pair.local} vs remote ${pair.remote}`)
  }
  console.error(`${drift} drifted migration(s) — see docs/operations.md`)
  process.exit(1)
}

console.log(`${summary.synced} migrations in sync`)
