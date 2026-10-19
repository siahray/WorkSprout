# Operations runbook

Logging, monitoring, migration hygiene, and backups. Written for this
deployment (Next.js on Vercel, Supabase free-tier project, GitHub Actions);
each section says what is built, what is not, and the one-time setup that
activates it.

---

## Where to look when something breaks

**Vercel → Observability (function logs).** Every server failure path logs
through `logError` (`lib/log.ts`) as one line of JSON:

```json
{"error":{"message":"...","code":"23505",...},"level":"error","event":"create client failed"}
```

- `event` is a stable identifier ("create client failed", "resend send
  failed") — search it directly, or filter `"level":"error"` for everything.
- `error` is normalized: `Error` instances become `{ message, name, stack }`,
  Supabase errors keep `code` / `details` / `hint`, and newlines are escaped
  so one failure is always one log line.
- **Uncaught** server errors — an exception that escapes a route handler,
  server action, render, or the proxy — are captured by `instrumentation.ts`
  (`onRequestError`) and logged as `unhandled request error` with the path,
  method, route type, and React's error digest.

Not captured: errors thrown in the browser (client components). Shipping
those home needs an ingestion endpoint plus rate limiting — not built; see
the extension point below.

## Health endpoint & uptime monitoring

`GET /api/health` is a public, unauthenticated liveness probe:

| Response | Meaning |
|---|---|
| `200 {"status":"ok","database":"up"}` | The app can reach the database. |
| `503 {"status":"unavailable","database":"down"}` | Query to Supabase failed (network, PostgREST, permissions). Logged as `health database probe failed`. |
| `503 {"status":"unavailable","database":"unconfigured"}` | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` missing. |

**One-time setup:** point a free uptime monitor (UptimeRobot, Better Stack,
cron-job.org — all fine) at `https://<site>/api/health`, checking every
~5 minutes. That is what turns "nobody noticed the site is down" into an
alert; it requires an account on your side and cannot be automated from
this repo.

## Error tracking (Sentry — extension point, not wired)

Structured logs cover diagnosis; they do not *push* alerts when a new error
type appears. When you want that: create a Sentry project, add the DSN as a
Vercel env var, and initialise it in `instrumentation.ts`'s `register()`
(`Sentry.init` + `Sentry.captureException` inside `onRequestError`, per
Sentry's Next.js guide). `logError` stays as it is — logs remain in Vercel
either way. Blocked on an account/DSN, which is why it is not built.

---

## Migration drift check

`supabase/migrations/` and the remote history can disagree in two ways:

- **local-only** — a migration file that was never `db push`ed.
- **remote-only** — a schema change applied by hand in the dashboard with
  no migration file. This is the dangerous one: the next `db push` and any
  fresh clone now disagree with production.

`.github/workflows/drift.yml` runs `supabase migration list` and
`scripts/check-drift.ts` on pushes/PRs to `main`, plus a weekly schedule
(so a dashboard edit is caught even with no deploy).

**One-time setup to activate it:** create a token at
<https://supabase.com/dashboard/account/tokens>, then repo *Settings →
Secrets and variables → Actions → New repository secret* named
`SUPABASE_ACCESS_TOKEN`. Until then the job prints a notice and passes —
CI stays green but nothing is checked.

Run it locally the same way CI does:

```sh
bunx supabase migration list --output-format json > /tmp/migrations.json
bun scripts/check-drift.ts /tmp/migrations.json   # exit 1 on any drift
```

The project ref (`qjvrmyqvucwnihwrtkuj`) is public — it is inside
`NEXT_PUBLIC_SUPABASE_URL` in the client bundle — so it is hard-coded in
the workflow rather than kept as a secret.

---

## Backups & restore

### What Supabase does for you

- **Free tier: nothing.** No automatic backups, no point-in-time recovery
  (pricing page: "Automatic backups — not included in free"). If this
  project is on the free tier, everything below is manual.
- **Pro:** daily backups with 7-day retention. PITR is a separate paid
  add-on (~$100/mo) and is not needed for a beta of this size.

### Taking a backup

The database password is needed for both paths (Dashboard → Connect →
set or reset it). **Neither path has been exercised on this machine** — it
has no Docker/Podman and no libpq, so `db dump` fails with
`docker: command not found`. Run a dump and a restore drill before
trusting either.

*With Docker or Podman* (the official CLI path):

```sh
bunx supabase db dump --linked -f backup-$(date +%Y-%m-%d).sql
```

*Without Docker* (pg_dump over the session pooler):

```sh
brew install libpq
"$(brew --prefix libpq)/bin/pg_dump" "$SESSION_POOLER_URL" -f backup-$(date +%Y-%m-%d).sql
```

`$SESSION_POOLER_URL` is the session-pooler URI from Dashboard → Connect.

### What a dump does and does not contain

- **Contains:** every table's rows — clients, projects, invoices, items,
  payments, expenses, time entries, API-key hashes, events, idempotency
  records — plus `auth` (accounts) and storage *metadata*.
- **Does not contain:** the attachment files themselves. Receipts and
  invoice PDFs live in Supabase Storage, which is outside the database and
  outside `pg_dump`. Export the attachments bucket separately
  (Dashboard → Storage → bucket → select → Download, or rclone). Missing
  this is the classic false-positive backup: the rows restore, every
  attachment 404s.

### Cadence & where dumps live

- Weekly, plus one before any risky migration.
- **Never commit a dump, and never upload one as a CI artifact** — this
  repository is public, so either would publish every user's data.
  Store dumps off-repo: encrypted disk, a password-manager attachment, or a
  private cloud folder.

### Restore drill (run once, then annually)

A backup you have not restored is a hypothesis. The clean target is a
**fresh** Supabase project — restoring over a live one collides with
existing tables.

1. Create a scratch Supabase project; wait for it to boot.
2. `"$SESSION_POOLER_URL_NEW" psql -f backup-<date>.sql` — or
   `psql` with the new project's session-pooler URI.
3. Verify: sign in (accounts restored), open an invoice, and check an
   attachment URL still resolves (metadata restored; re-upload storage
   exports if bytes are missing).
4. If this is a real move rather than a drill: point Vercel at the new
   project (`NEXT_PUBLIC_SUPABASE_URL`, keys), `bunx supabase link
   --project-ref <new-ref>`, and re-add the auth redirect URL (below).

---

## One-time setup checklist (beta)

| Where | What | Why |
|---|---|---|
| Supabase → Auth → URL Configuration | `https://<site>/auth/callback` in Redirect URLs | Password-reset emails break without it. |
| Vercel env | `SUPABASE_SERVICE_ROLE_KEY` | Enables `/api/v1` (returns `503 not_configured` without it). |
| Vercel env | `RESEND_API_KEY` + `EMAIL_FROM` | Invoice email; off until both are set. |
| GitHub repo secrets | `SUPABASE_ACCESS_TOKEN` | Activates the drift check above. |
| Uptime monitor | Point at `/api/health` | Turns downtime into an alert. |
