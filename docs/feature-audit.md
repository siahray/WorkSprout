# WorkSprout — Feature Audit & Automation Readiness

**Date:** 19 October 2026
**Branches:** PRs #18–#32 merged. No open branches.
**Method:** static inventory of `app/**` routes, server actions, route handlers, `supabase/migrations/*.sql`, database functions and triggers, and CI workflows. No runtime walkthrough.

Legend: ✅ built · ⚠️ partial · ❌ absent

---

## 1. System insight

### 1.1 CRUD completeness — Update is the systematic gap

The app was complete on Create / Read / Delete and weak on Update. The Update column is now largely closed (see the changelog at the end).

| Entity | Create | Read | Update | Delete |
|---|---|---|---|---|
| Clients | ✅ | ✅ | ✅ | ✅ |
| Projects | ✅ | ✅ | ✅ | ✅ |
| **Expenses** | ✅ | ✅ | ✅ | ✅ |
| **Invoices** | ✅ | ✅ | ✅ draft only | draft only |
| Invoice items | via invoice | ✅ | ✅ via invoice | ✅ via invoice |
| Payments | ✅ | ✅ | ✅ | ✅ |
| Phases | ✅ | ✅ | ✅ rename | ✅ |
| Tasks | ✅ | ✅ | ✅ rename + status | ✅ |
| Subtasks | ✅ | ✅ | ✅ rename + status | ✅ |
| Time entries | ✅ | ✅ | manual only | ✅ |
| Calls | ✅ | ✅ | status only | ✅ |
| Todos | ✅ | ✅ | toggle only | ✅ |

Invoices used to be **immutable** once created — no `updateInvoice`, no line-item editing, no correcting a typo — and expenses and payments had no correction path either. That was the largest basic-feature gap, and the one automation collides with hardest: automated writes with no correction path make every bad write permanent. Those three paths now exist.

### 1.2 There is a programmatic surface now, but it only reads

| Automation primitive | Status |
|---|---|
| Authenticated public API | ⚠️ partial — reads (`GET /api/v1/me`, `/events`) plus creates (`POST /api/v1/clients`, `/calls`). No update or delete, and nothing else is creatable. |
| User API keys / tokens | ✅ `api_keys` — hashed, shown once, managed in Settings → Automation |
| Event emitter | ✅ `events` — written by triggers on invoices, payments, calls, clients, expenses |
| Webhook *delivery* | ❌ pull feed only; no push, no retry worker, no signing |
| Scheduled jobs | ❌ no pg_cron, no queue |
| Idempotency | ✅ **Both surfaces.** API writes via `Idempotency-Key` + `idempotency_keys` (service-role, RLS deny-all). App mutations via a per-form `submission_key` + `form_submissions` (session-scoped, `auth.uid() = user_id`) — a resubmit of `addPayment` / `createInvoice` replays the first result instead of double-writing. |
| Tests | ⚠️ `bun test` harness — 70 tests covering API validation and idempotency, the form-idempotency helper, the drift summariser and log formatter, and the **pure money paths**: invoice tax math, timer elapsed, money/quantity parsing, currency and hour formatting. **The server actions and DB writes are still untested.** |
| CI | lint + typecheck + tests + build (plus CodeQL + ZAP). The test step runs. |

Every app mutation is still a Next.js server action — a private RPC bound to a session cookie. `/api/v1` is the first surface an external caller can authenticate to, and it can now do two of the things automation needs: read what happened, and create a client or an appointment. The remaining gaps are update/delete, and the rest of the entities.

### 1.3 The good precedent already exists

The concurrency-sensitive paths are partly safe already: the timer runs through DB RPCs (`start_timer` / `pause_timer` / `resume_timer` / `stop_timer`) and invoice numbering uses collision retry. The team already knows the pattern of pushing invariants into Postgres — that is the precedent to follow for automation rather than doing it in TypeScript.

The event log follows it: `events` is written by an `after insert or update or delete` **trigger**, not by application code. The trigger runs in the same transaction as the change it describes, so an event cannot be lost to a crash between the write and the insert, and every writer is captured — including any added later. Its body is wrapped so a fault in recording can never fail the user's actual write.

---

## 2. Every basic feature, laid out

### Auth & accounts
- ✅ Login, logout, invite-only signup with OTP, waitlist, DB-level signup gate
- ✅ Password reset / forgot-password page (in-app: request → emailed link → `/auth/callback` exchanges the PKCE code → `/reset-password`)
- ❌ Email change flow, account deletion, session/device management
- ❌ MFA

### Clients
- ✅ CRUD, detail page, per-client outstanding balance
- ✅ Archive vs hard delete — `archived_at` pulls a client out of every list and picker while their projects, invoices, time, and attachments stay intact; restore clears it. Hard delete remains for real removal, and stays destructive: it cascades projects and tasks, and refuses while invoices exist.
- ❌ Client-facing portal or login
- ❌ Contact persons / multiple emails per client — **this is what blocks CRM sync**; `clients` holds a single `email`, so there is no contact to map a CRM to

### Projects
- ✅ CRUD, hourly + fixed rates, statuses, phases, tasks, subtasks, progress
- ✅ Rename and reorder phases, tasks, subtasks — inline rename on the project page; up/down reorder scoped to each phase (or Unassigned), parent task, or project. `tasks` and `subtasks` gained a `position` column (`20261018120000`, backfilled from `created_at` so nothing visibly moved); `phases` already had one.
- ❌ Templates, duplication, per-task rate or estimate
- ❌ Budget vs actual burn

### Time tracking
- ✅ Live timer with pause/resume, manual entries, edit/delete
- ✅ Editing timer-generated entries — the same `update_manual_entry` path handles them; it only requires a stopped, unbilled entry. (An earlier version of this audit marked this ❌ by inferring from the function's name rather than reading its SQL.)
- ❌ Approval/lock, rounding rules, billable/non-billable flag beyond project
- ❌ Timesheet view by week/month, export

### Invoices
- ✅ Build from unbilled time + manual lines, multi-tax, numbering, PDF, email, public link, payments, void, statuses
- ✅ **Edit after creation** — draft invoices only, header plus line items
- ❌ Duplicate/repeat invoice, credit notes, partial void
- ❌ Recurring invoices, retainers, deposits
- ❌ Dunning/reminder schedule, overdue automation
- ❌ Multi-currency (PHP hardcoded in `lib/format.ts`)

### Expenses
- ✅ Create / read / delete, 9 categories, month grouping, project linking, modal capture
- ✅ **Edit** — `updateExpense` and an edit modal
- ✅ Receipt attachment — each expense row opens a receipts panel (upload, signed-URL preview, removal)
- ❌ Recurring/subscription expenses
- ❌ Mileage, reimbursable flag, vendor field
- ❌ Export (CSV / accounting)

### Calls
- ✅ Scheduling, statuses, email invite with ICS, public page, timezone-correct
- ✅ Bookable from outside the app (`POST /api/v1/calls`)
- ❌ Reschedule/edit, reminders before the call, two-way calendar sync
- ❌ Recording/notes capture, follow-up tasks

### Attachments
- ✅ Direct-to-Storage upload, signed URLs, 10 MB cap, type allowlist, cleanup on delete
- ✅ Expenses as parents (receipts)
- ❌ Clients as parents
- ❌ Versioning, virus scanning, quota display

### Notifications & comms
- ✅ Outbound email via Resend for invoices, invites, broadcasts
- ❌ In-app notifications, notification preferences
- ❌ Inbound email, delivery webhooks, retry on failure
- ⚠️ Email is env-gated and currently **off** (blank `RESEND_API_KEY` / `EMAIL_FROM`) — this also blocks appointment reminders

### Reporting
- ✅ Dashboard KPIs, business health, project margins, admin analytics
- ❌ Per-client / per-period P&L export, tax reports (BIR), cash-flow view
- ❌ Any export other than invoice PDF and admin signups CSV

### Platform / ops
- ✅ RLS on user tables, `updated_at` triggers, admin audit log, four CI workflows (build, ZAP, CodeQL, migration drift)
- ⚠️ **Tests of any kind** — a `bun test` harness now exists (see the changelog) with 70 tests, covering the API layer, the form-idempotency helper, the drift summariser and log formatter, and the pure money paths: tax math, timer elapsed, money parsing, formatting. Still nothing exercises the server actions end-to-end or asserts against a real database.
- ✅ CI runs a real test step (was: nothing to run)
- ❌ Rate limiting (deferred with the dormant API layer)
- ⚠️ Pagination — invoices, expenses, and time entries fetch 50 rows per page with a Previous/Next footer, and an out-of-range `?page=` redirects to the last real page. The bounded workspace lists (clients, projects) and every picker still load in full by design.
- ✅ Search on expenses and invoices — server-side `?q=`, sanitised so free text cannot break the PostgREST filter, starting back at page 1 on every new query
- ✅ Observability beyond `console.error` — every server failure path logs one line of JSON through `logError` (`lib/log.ts`; all 89 former `console.error` sites migrated) with a stable `event` key and normalized error details, uncaught server errors (route/action/render/proxy) are captured by `instrumentation.ts`'s `onRequestError`, and `GET /api/health` gives an uptime monitor something to probe. `docs/operations.md` says where to look and how to wire a monitor or Sentry; client-side error capture and an alerting service are the documented extension points, not built.
- ✅ Migration baseline — `config.toml` exists, every migration is recorded in the remote history (0 pending), and a CI drift check (`.github/workflows/drift.yml` + `scripts/check-drift.ts`) now fails on any local↔remote mismatch, on pushes/PRs plus a weekly schedule. It is gated on the `SUPABASE_ACCESS_TOKEN` repo secret and skips with a notice until that secret is added — see `docs/operations.md`.
- ⚠️ Backups/restore runbook — `docs/operations.md` documents both dump paths (CLI `db dump` with Docker/Podman, or `pg_dump` over the pooler without), what a dump does and does not contain (Storage object bytes are **not** included), cadence, off-site storage (never in this public repo), and a restore drill. Still ⚠️ because no dump has ever been taken: this machine has no Docker or libpq, the free tier has no automatic backups, and the runbook's dump commands are documented-but-unexercised until the drill is run once.

---

## 3. What automation needs first

Ordered by dependency, not preference.

1. ~~**Update paths** — `updateInvoice`, `updateExpense`, `updatePayment`, plus line-item editing.~~ **Done** — all four exist as of the changelog below. Automation without correction is a liability, so this was the blocker.
2. **An authenticated API surface** — ⚠️ **partly done.** `api_keys` authenticate `/api/v1`; the event feed is readable and clients and appointments can be created. Missing: update/delete, and create for projects, time, expenses and invoices. Target: `openapi/work-sprout.v1.yaml`.
3. ~~**Idempotency**~~ **Done for both surfaces.** The API (`Idempotency-Key`, replayed from `idempotency_keys`) was the urgent case, because a machine retries where a person does not. The app's own money mutations are now covered too: `addPayment` and `createInvoice` carry a per-form `submission_key` checked against `form_submissions`, so a resubmit replays the first result rather than double-writing.
4. ~~**Event/outbox table** — one `events` table written in the same transaction as mutations.~~ **Done** — `events`, written by triggers, which is a true outbox. It gives a *pull* feed; **push webhooks are not built** and would need a delivery worker plus a scheduler.
5. **A test harness** — ⚠️ **well started.** `bun test` is wired up and runs in CI, with a fake supabase client. 70 tests now cover API validation, API idempotency, the form-idempotency helper, the drift summariser and log formatter, and the pure money paths the audit worried about — tax math, timer elapsed, money parsing, formatting. What is still missing is integration-level coverage: no test drives a server action end-to-end or asserts against a real database.
6. **Then** recurring invoices, dunning, reminders — consumers of step 4.

---

## 4. Open questions before committing to automation

1. ~~**What does "automation" mean here**~~ **Answered:** emails, CRMs and appointments, delivered by an **external tool** (n8n / Make / Zapier) that WorkSprout feeds. WorkSprout is not becoming a CRM, booking system or email marketing suite; it exposes what happened and lets the external tool own those domains. CRM sync is deferred, and blocked on the missing contacts model (see Clients above).
2. **Who is the actor** — you, your clients, or a machine? Client-facing automation implies a client portal, which does not exist and is a far bigger build than an API.
3. **Which single manual task hurts most right now?** "I forget to send invoices" → dunning + scheduler, not an API. "Entering expenses" → receipt parsing, which needs storage parents extended first.
4. ~~**Will you freeze features to build the platform layer** (write API, events, tests)?~~ **Answered:** no freeze, but the platform layer is being built alongside — write API, events, tests. The write endpoints, the test harness, and coverage of the pure money math are in. What remains untested is the server actions themselves, which need a real database to test honestly.
5. **Is PHP-only, single-user, no-team deliberate** or accidental? It decides whether automation must be tenant-aware from day one. It also decides whether a single `clients.email` is a real limitation or a deliberate one.
6. **What is the success metric** — hours saved per week, invoices sent on time, or data captured without touch?

---

## Appendix — Evidence

**Route handlers (9)**

| Path | Purpose |
|---|---|
| `app/i/[token]/pdf/route.ts` | public invoice PDF |
| `app/c/[token]/ics/route.ts` | public calendar file |
| `app/attachments/[id]/route.ts` | signed-URL redirect |
| `app/admin/(console)/signups-export/route.ts` | admin CSV export |
| `app/api/health/route.ts` | public liveness probe (no auth) |
| `app/api/v1/events/route.ts` | integration API — poll the event log |
| `app/api/v1/me/route.ts` | integration API — verify an API key |
| `app/api/v1/clients/route.ts` | integration API — create a client |
| `app/api/v1/calls/route.ts` | integration API — book an appointment |

**Server actions by module**

| Module | Actions |
|---|---|
| Clients | `createClient`, `updateClient`, `deleteClient`, `archiveClient`, `restoreClient` |
| Projects | `createProject`, `updateProject`, `deleteProject`, `addPhase`, `updatePhase`, `movePhase`, `deletePhase`, `addTask`, `updateTask`, `moveTask`, `setTaskStatus`, `deleteTask`, `addSubtask`, `updateSubtask`, `moveSubtask`, `setSubtaskStatus`, `deleteSubtask` |
| Time | `startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer`, `addManualEntry`, `updateManualEntry`, `deleteTimeEntry` |
| Invoices | `createInvoice`, `updateInvoice`, `sendInvoice`, `markInvoiceSent`, `voidInvoice`, `deleteInvoice`, `addPayment`, `updatePayment`, `deletePayment` |
| Expenses | `createExpense`, `updateExpense`, `deleteExpense` |
| Focus | `createTodo`, `toggleTodo`, `addToToday`, `deleteTodo`, `createCall`, `deleteCall`, `setCallStatus`, `sendCallInvite` |
| Attachments | `recordAttachment`, `deleteAttachment` |
| Settings | `updateProfile`, `changePassword`, `createApiKey`, `revokeApiKey` |
| Feedback | `submitFeedback` |
| Admin | `sendInvite`, `login`, `logout`, `deleteSignup`, `bulkDeleteSignups`, `setUserRole`, `setUserBanned`, `sendBroadcast`, `updateFeedbackStatus`, `deleteFeedback` |

**Database functions / RPCs**

`handle_new_user`, `add_manual_entry`, `update_manual_entry`, `admin_is_admin`, `admin_list_users`, `admin_set_admin_role`, `admin_set_user_banned`, `admin_usage_stats`, `call_public`, `invoice_public`, `hook_restrict_beta_signup`, `is_beta_signup`, `pause_timer`, `resume_timer`, `start_timer`, `stop_timer`, `set_updated_at`, `record_event`, `invoice_outstanding`, `expense_totals`, `time_totals`

**Database triggers**

`record_event` on `invoices`, `payments`, `calls`, `clients`, `expenses` (`after insert or update or delete`, `security definer`). One `set_updated_at` trigger per mutable table.

**Explicitly not present:** webhook delivery or a retry worker, pg_cron or queue usage, realtime subscriptions, rate limiting (deferred with the API layer).

---

## Changelog

### Correction paths (branch `feat/correction-paths`)

| Change | Notes |
|---|---|
| `updateExpense` + edit modal | Verifies the update landed via `.select()`, so a missing row errors rather than reporting a false success. |
| `updatePayment` + edit dialog | Rejects payments on a void invoice, matching `addPayment`. |
| `updateInvoice` + line-item editor | Draft only. Recomputes subtotal/tax/total from invoice items; reuses the invoice's own tax snapshot. |
| `update_manual_entry` guard | Migration `20261017120000`. |
| Migration baseline | `config.toml` added; `initial.sql` renamed; all migrations recorded remotely. |

### Integration API, phase 1 — reads (branch `feat/integration-api`)

| Change | Notes |
|---|---|
| `api_keys` | SHA-256 hash only; the raw key is shown once. Managed in Settings → Automation; revoke is soft, so the row survives as an audit trail. |
| `events` + `record_event` trigger | Append-only log with a monotonic identity `id` that doubles as the polling cursor. Emitted by trigger, so it is transactional with the mutation and catches every writer. `public_token` is stripped from payloads. |
| `GET /api/v1/events` | Cursor feed: `after`, `limit` (max 500), `type`. One extra row reveals `has_more` without a second count. |
| `GET /api/v1/me` | Connection test for wiring an external tool up. |
| `openapi/work-sprout.v1.yaml` | The contract, and the artifact n8n / Make / Zapier import to generate actions. |
| `docs/integration-api.md` | Setup, polling semantics, event catalogue, retention. |

Deliberate limits: **no push webhooks** — delivery needs a scheduler and a retry worker this deployment does not have, so the feed is pull-only — and **no write endpoints** (those are phase 2, below). `SUPABASE_SERVICE_ROLE_KEY` is required and is unset, so `/api/v1` returns `503 not_configured` until it is added.

Two decisions worth keeping: the API is **not** a passthrough to the database — a generic Postgres connector would bypass invoice numbering, the generated `amount` column, the tax snapshot, derived status and RLS — and the service-role client it uses must scope every query to the key's `user_id` explicitly, since it bypasses RLS.

### Integration API, phase 2 — writes (branch `feat/integration-api`)

| Change | Notes |
|---|---|
| `POST /api/v1/clients` | Creates a client; returns `201` with the new id. |
| `POST /api/v1/calls` | Books an appointment. `scheduled_at` is an ISO 8601 instant stored UTC; `client_id`, if given, must belong to the same account. |
| `idempotency_keys` + `Idempotency-Key` | A retrying caller is the normal case, so a write is deduplicated on a caller-supplied key: the first request runs and records its response, the rest replay it. Same key with a different body → `409 idempotency_conflict`; a key still running → `409 request_in_progress`. RLS is deny-all; only the service role touches the table. |
| `lib/api-mutations.ts` | The create rules, **shared with the app's own server actions** — `createClient` and `createCall` were refactored to call it, so a rule cannot apply to the API and not to the form. |
| OpenAPI + `docs/integration-api.md` | Contract and walkthrough for writing, including the idempotency rules. |

Scope was chosen for the brief rather than the easy win: a client and an appointment are exactly what the external tool owns (CRM contacts, bookings). Update, delete, and the other entities are not built — an endpoint is now a function plus a thin route, since auth, idempotency, body parsing and error mapping are generic.

The failure mode this closes is the one that matters for money and calendars: a timeout retried into a duplicate appointment. The app's own `addPayment` and `createInvoice` still lack it, and are the next candidate.

### Test harness (branch `test/api-integration`)

| Change | Notes |
|---|---|
| `bun test` + `tsconfig.test.json` | The runner ships with Bun, so no new test framework. `bun-types` was added only so the tests type-check. The main tsconfig now excludes `test/`, so `next build` does not try to compile it. |
| `test/fake-supabase.ts` | A hand-written stand-in for supabase-js. No module mocking and no network. |
| 3 smoke tests | API input validation and the idempotency outcomes (run, replay, conflict, in-progress) plus the `Idempotency-Key` length limit. The suite has since grown to 50 — see the app-side idempotency and money-path test entries below. |
| CI | `typecheck`, `test:types` and `bun test` now run before the build. |

This closes "zero test files" and nothing more. The money paths this audit actually worries about — invoice math, payments, the timer — have since been covered at the pure-function level, though the server actions themselves remain untested.

What made this cheap is a decision from phase 2: `createClientRecord`, `scheduleCall` and `withIdempotency` take their supabase client as a *parameter*. That was done to share rules with the server actions; it also means the tests need no module mocking. The harness is the enabling change — the coverage is the remaining work.

### CI fix (branch `fix/codeql-configuration`)

| Change | Notes |
|---|---|
| CodeQL language identifier | `languages: javascript, typescript` → `javascript-typescript`, plus an explicit `category`. TypeScript is analysed by the JavaScript extractor; the legacy and combined names are treated as *different* configurations, which made the "Code scanning results" check report "1 configuration not found" and fail every PR. |

### Rename & reorder (branch `feat/rename-reorder`)

| Change | Notes |
|---|---|
| `updatePhase`, `updateTask`, `updateSubtask` | Inline rename on the project page — the title is a button until clicked, then a focused input; Enter/blur saves, Escape cancels. Each update verifies the row landed via `.select()` (same pattern as `updateExpense`), so a deleted-elsewhere row errors instead of reporting a false success. Closes the last CRUD gap: Phases Update. |
| `movePhase`, `moveTask`, `moveSubtask` | Up/down reorder. Siblings are read in page order, the pair swaps, and `writeOrder` rewrites only the rows whose position changed — reporting a failure rather than claiming success. Scope matches the UI: project for phases, (project, phase) with null phase as its own bucket for tasks, parent for subtasks. |
| Migration `20261018120000` | `tasks` and `subtasks` had no `position` column (phases did) — they were listed by `created_at`. Both gained one, backfilled by `row_number()` over the existing `created_at` order so nothing visibly moved, plus indexes for the ordered reads. `addTask`/`addSubtask` now append (`max + 1`) into their group like `addPhase` already did. |
| Order alignment | The project page, `/focus`, and the timer's task dropdown now read the same order — the dropdown sorts the flat list by phase position then task position to mirror how the page groups them. |

Rename was the correction testers would hit fastest ("I typo'd a task name and can't fix it"); reorder rides on the same controls. Deliberately up/down buttons, not drag-and-drop — no new dependency, keyboard-accessible, and consistent with the existing select/button vocabulary.

### App-side idempotency (branch `feat/app-idempotency`)

| Change | Notes |
|---|---|
| `form_submissions` | Migration `20261017170000`. The mirror of `idempotency_keys` for the app, and deliberately the *opposite* RLS model: that table is deny-all so only the service-role client reaches it, while this one is `auth.uid() = user_id`, because server actions have a session and no service role. The unique `(user_id, key)` constraint is what actually serialises a double-submit. |
| `lib/form-idempotency.ts` | `claimFormSubmission` / `storeFormResponse` / `releaseFormClaim`. Three explicit steps rather than a wrapper, because `createInvoice` ends in `redirect()` — which throws `NEXT_REDIRECT` and must stay outside any try/catch, so a wrapper that caught everything would swallow it. |
| `lib/use-submission-key.ts` | Mints the key client-side and rotates it after each success. |
| `addPayment` / `createInvoice` | Claim before writing, replay the stored result on a resubmit, release the claim on every failure path. `createInvoice`'s replay redirects to the invoice the first attempt created. |

The two money paths were not equally exposed, and the difference is worth recording: `addPayment` had **no guard at all**, so a resubmit wrote a second row and double-counted the money. `createInvoice` had *accidental* partial protection — line 84 only collects entries whose `invoice_id` is still null, so tracked time was already safe — but **manual lines were not**: a resubmit minted a second invoice containing them, and with no manual lines the user got the baffling "Add at least one line" error on a form they had clearly filled in.

Two constraints shaped the key, and both were found by reading the code rather than assuming:

- **It must rotate after every success.** `PaymentForm` is rendered *inline* on the invoice page (`invoices/[id]/page.tsx:149`) and stays mounted — it is not in a dialog. A "one key per mount" rule would let payment #1 consume the key and then silently swallow payment #2 as a duplicate: a real money loss, not a cosmetic bug.
- **It cannot be deterministic.** `useId()`-style ids survive a page reload, so payment #2 after a reload would collide with payment #1. The key is a `crypto.randomUUID()` minted in an effect, which also keeps it out of SSR and avoids a hydration mismatch. Until that effect runs the key is empty, and the server treats an empty key as "no key": the mutation simply runs.

Scope is **resubmits only** — double-click, back button, network retry. A second browser tab has its own key, so it is not covered; that case needs time entries locked when the new-invoice form opens, with expiry and stale-lock UX, and is better taken as its own batch. On a replay the user sees the **same success as the original** ("Payment recorded.", or a redirect to the same invoice) rather than an "already recorded" notice: they clicked once and exactly one payment exists, so warning them would be noise.

### Money-path tests (branch `test/money-paths`)

| Change | Notes |
|---|---|
| `test/tax-simple.test.ts` | `round2`, `coerceTaxes`, `taxLines`, `taxTotal`. |
| `test/timer-simple.test.ts` | `timerElapsedSeconds`, `formatElapsed`. |
| `test/format-simple.test.ts` | `decimalHours`, `hoursFromMinutes`, `peso`, `formatPercent`. |
| `test/money-entry-simple.test.ts` | `money` and `quantity` from `lib/validation`, built on a real `FormData`. |

Suite: 13 → **50 tests**. This closes the audit's "invoice math, payments and the timer are still untested" — for the **pure functions only**. Nothing here drives a server action or touches a database, so the row stays ⚠️ rather than becoming ✅.

Two findings worth recording, both of which came from verifying against real output instead of trusting an intuition about how the code "should" behave:

- **The rounding invariant in `tax.ts` is real and load-bearing.** The comment promises the invoice total always matches the sum of the displayed lines. For subtotal `1.01` with two 33.33% taxes, rounding each line then summing gives **0.68**, while rounding the raw sum gives **0.67**. An invoice whose printed lines did not add up to its printed total would be an obvious credibility problem, so the invariant is now pinned rather than assumed.
- **`addPayment` re-implements `money()` inline.** `lib/validation.ts` already exports a `money()` parser doing exactly the same `₱`/comma/leading-`p` stripping that `app/(app)/invoices/actions.ts:564` copies by hand. The two disagree narrowly — `money()` rejects negatives and accepts `0`; `addPayment` requires `> 0` — so it is duplication, not a defect, and both are now tested. Worth folding `addPayment` onto the shared helper at some point, but that is a production change and did not belong in a test batch.

**Three of the first assertions written were wrong and were corrected against observed behaviour**, which is the whole argument for running tests rather than reasoning about them: `round2(0.065)` rounds *up* to `0.07` (the product is exactly `6.5`), not down to `0.06`; `round2(0.145)` rounds *down* to `0.14` (`14.499999999999998`); `formatPercent(null)` renders `"0%"`, not an em dash. A fourth, `formatElapsed(3_600_000)`, was simply bad arithmetic on my part — that is 1000 hours, not 100.

### Password reset (branch `feat/password-reset`)

| Change | Notes |
|---|---|
| `app/forgot-password/` | Server action calls `resetPasswordForEmail` with `redirectTo: /auth/callback?next=/reset-password`. Success answers the same whether or not the account exists — a different message would let anyone probe which emails have WorkSprout accounts — with rate-limit as the one error that is reported honestly. |
| `app/auth/callback/route.ts` | Exchanges the emailed PKCE `code` for a real session (without it `/reset-password` has no session to act on), only ever redirects to an in-app path, and sends a bad/expired code to `?expired=1` instead of a dead end. |
| `app/reset-password/` + login link | The in-app new-password form, and the "Forgot password?" entry point the audit's ❌ pointed at. |

Rides Supabase's auth email service, so it is independent of the app's Resend config — the two email paths stay separate. **Operational gate:** `https://<site>/auth/callback` must be in Dashboard → Authentication → URL Configuration → Redirect URLs, or the emailed link lands on the Site URL and the flow breaks there.

### CI typegen fix (branch `fix/ci-typegen`)

| Change | Notes |
|---|---|
| `next typegen` before typecheck | `build-and-test` had failed on **every** run since it landed — on `main` itself included. A fresh checkout has no `.next`, so `tsc --noEmit` could not resolve the generated global `LayoutProps` in `app/layout.tsx`, and the step exited before tests and the build ever ran. It went unnoticed because nothing enforced the check, so merges went through red. Next.js 16 documents `next typegen && tsc --noEmit` for exactly this case — route types are generated during `next dev`/`next build`, or standalone. The pipeline went fully green (build, ZAP, CodeQL) for the first time on the next run. |

### Expense receipts (branch `feat/expense-receipts`)

| Change | Notes |
|---|---|
| Migration `20261018130000` | `attachments` gains `expense_id` (FK, `on delete cascade`) as a third parent, and `attachments_parent_check` now demands exactly one of project / invoice / expense. The RLS `with check` grew a branch proving the expense belongs to the caller. Storage policies needed no change — they only inspect the owner-id folder segment, which `expense` fits into as a path segment. |
| `recordAttachment` / `deleteAttachment` | Accept `expense` as a parent type; the parent-ownership probe goes through one `PARENT_TABLE` map, and removals revalidate `/expenses` (there is no expense detail page — receipts live on the list). |
| `deleteExpense` | Removes Storage objects before the cascade drops their metadata rows — the pre-delete cleanup invoices and projects already do, without which the object would outlive its row. |
| `ReceiptsDialog` | A per-row "Receipt (n)" button on the expenses table opening the standard modal with the existing uploader + list. Content mounts only while open, matching the edit dialog. |

Receipts attach from the saved expense's row, not inside the add-expense form: the upload target needs an id that does not exist until the insert lands, and keeping upload out of the create form leaves that money-adjacent action's shape untouched. Deleting a project does **not** delete its expenses — the FK is `on delete set null` — so receipt cleanup belongs solely to `deleteExpense`, and no project/client cascade had to grow an expense branch.

### Client archive (branch `feat/archive-clients`)

| Change | Notes |
|---|---|
| Migration `20261018140000` | `clients.archived_at` (nullable timestamptz). NULL = active. Visibility only: no backfill, no RLS change (the owner policy already covers the update), no index (per-user lists are tiny and always scanned under `user_id`). |
| `archiveClient` / `restoreClient` | Flip the timestamp and verify the row landed with `.select()` — the same row-verify the update actions use. Both revalidate the list and the detail page. |
| Clients list | Active clients by default; an `Archived (n)` link opens `?archived=1`, where rows carry an `Archived` badge and the third column shows the archive date instead of "Client since". Each empty state points at the other view. |
| Client detail page | `Archived` badge in the header, an Archive/Restore card above the danger zone, and the "New project" / "Create one" invitations hidden while archived. Projects and invoices stay visible — history never disappears, and delete remains available. |
| Pickers exclude archived clients | New project, new invoice, the focus page's call form, and the dashboard's client count and panel all filter to active clients. Deep links keep their preselected client visible (validated with `isUuid` before it enters a PostgREST `or()`), and edit forms keep the record's *own* client selectable via `archived_at.is.null,id.eq.<current>` — a form can never silently repoint a record at someone else. |
| Server-side guards | `createProject`, `createInvoice`, `updateInvoice` (only when *switching* to an archived client), and the shared `scheduleCall` — app form and integration API alike — refuse archived clients. Pickers are the convenience; the actions are the rule. `createProject` also gained the client-existence probe it never had: the read is RLS-scoped, so it now rejects ids owned by other users too, which the bare FK insert previously allowed. |

Archiving does not cascade: projects, invoices, time, and expenses are untouched, and the dashboard counts active clients only. To bill or schedule for an archived client, restore first — the error says so. The disproven claim at the old line 67 ("delete is destructive and cascading" as the *only* option) is replaced above: delete is still destructive, but it is no longer the only option.

### Pagination & search (branch `feat/pagination-search`)

| Change | Notes |
|---|---|
| Paginated lists | Invoices, expenses, and time entries fetch 50 rows per page (`.range()` + `count: 'exact'`) with a Previous/Next footer inside the table card; a `?page=` beyond the end redirects to the last real page instead of rendering an empty table. Page math lives in `lib/pagination.ts`, pinned by `test/pagination-simple.test.ts`. Clients and projects still load in full — they are bounded per account, and pickers need every option anyway. |
| Search on expenses and invoices | A GET form (same pattern as the admin console) filtering server-side: invoices on number + client name, expenses on description + note + category. Every new search drops back to page 1, pagination links carry the query along, and zero-result states offer a Clear link. |
| Filter-safe search text | `sanitizeSearch` (`lib/search.ts`) swaps `, ( ) \`, and control characters for LIKE's `_` wildcard before the term enters an `.or()` — a raw comma fails PostgREST's filter parsing (PGRST100) and turns the whole page into a 400, verified live — and the wildcard still matches the original text, so "Smith, John" finds "Smith, John". Dots, spaces, hyphens, and other punctuation were probed too and pass through untouched. |
| Stats moved into SQL | Migration `20261019100000_list_stats.sql`: `invoice_outstanding()`, `expense_totals(date)`, and `time_totals(uuid)` aggregate in Postgres under the caller's own RLS, so the headers keep reporting true totals (outstanding balance, all-time spend, unbilled hours) now that a page only ever receives one 50-row slice. Applied remotely via `supabase db push`. |
| Time page project filter | Moved from in-memory filtering to a `tasks!inner` join in the query — the old "fetch every entry, then filter" approach cannot survive pagination. A malformed `?project=` (not even a UUID) is now treated as no filter instead of handing PostgREST a cast it rejects. |

### Ops hardening (branch `feat/ops-hardening`)

| Change | Notes |
|---|---|
| `lib/log.ts` — structured logger | One line of JSON per event with a stable `event` key and normalized error details (`Error` → `message`/`name`/`stack`, Supabase errors keep `code`/`details`/`hint`, newlines escaped so a failure never splits across log lines). Context keys cannot spoof `level`/`event`. `formatLogRecord` is pure and pinned by `test/log-simple.test.ts`. |
| All 89 `console.error` sites migrated | Across 26 files in `app/` and `lib/`. The messages people already wrote became the `event` keys, so grepping the old strings still works — the difference is that Vercel can now filter and group on fields instead of us regexing prose. `console.error` survives only inside `logError` itself. |
| `instrumentation.ts` — `onRequestError` | Uncaught server errors (route handler, server action, RSC render, proxy) were only reaching Next's default stderr. They are now logged as `unhandled request error` with path, method, route type, and React's error digest — which is what identifies an error whose message React stripped. |
| `app/api/health/route.ts` | Public, unauthenticated liveness probe: `200 {status:"ok", database:"up"}` when a head-count query reaches PostgREST/Postgres (RLS hides the rows; the query still runs — verified live with the anon key), `503` with `down`/`unconfigured` otherwise, `Cache-Control: no-store`. Point a free uptime monitor at it — that is the step which turns downtime into an alert, and it needs an account on your side. |
| Drift check in CI | `.github/workflows/drift.yml` + `lib/drift.ts` (pure summariser, tested) + `scripts/check-drift.ts` (exit 1 with a per-migration verdict). Runs on pushes/PRs to main plus a weekly schedule, so a dashboard edit is caught without a deploy. Gated on the `SUPABASE_ACCESS_TOKEN` repo secret; without it the job prints a notice and passes. The whole recipe (token env var → `link --yes` → `migration list --output-format json`) was verified end-to-end against the real project from a clean, non-interactive environment; the drift verdicts were exercised with a fake migration file and a doctored JSON input. |
| `docs/operations.md` — runbook | Where logs live and how they are formatted, the health endpoint and monitor setup, the Sentry extension point, enabling the drift check, and backups/restore. The backup section is blunt about the facts: the free tier takes **no** automatic backups, a dump needs Docker/Podman (`supabase db dump`) or libpq (`pg_dump` over the pooler) — **neither exists on this machine, so no dump has ever been taken** — Storage object bytes are not in a dump, and a dump must never become a commit or CI artifact in this public repo. Includes a restore-drill checklist. |

Suite: 58 → **70 tests**. Test counts quoted elsewhere in the audit were stale at 50 (the pagination batch had taken it to 58) and are refreshed.

Two corrections to earlier assumptions, both from running things instead of trusting memory: `supabase db dump` **requires Docker/Podman** (it failed here with `docker: command not found`; `migration list`/`db push` do not need Docker, but `db dump` does) — the runbook documents both the Docker and the libpq path as a result. And the CLI's credentials live in the macOS keychain, which is exactly why CI must receive `SUPABASE_ACCESS_TOKEN` as a secret rather than inheriting anything local.



- **"Editing timer-generated entries" was never missing.** `update_manual_entry` only requires a stopped, unbilled entry, and the time list filters out running timers. The ❌ came from inferring behaviour from the function's name instead of reading its SQL.
- **`invoice_items.time_entry_id` is dormant.** The column exists, is indexed, has `on delete set null` and a comment promising line-level provenance to tracked time — but nothing in `app/` or `lib/` ever writes it. Billing groups many entries into one line, so a single FK cannot express the relationship; the design changed and the column was left behind. Consequence: **you cannot tell which line on an existing invoice came from tracked time.** The editor therefore replaces lines without touching time links, and releasing hours back to the unbilled pool remains void's job.

### Bugs found while doing this

- **`update_manual_entry` reported success for writes that never happened.** It had no `if not found then raise`, unlike `start_timer`/`pause_timer`/`resume_timer`. A stale edit form, an entry invoiced since the page loaded, or one deleted in another tab returned void, and the action still answered "Time entry updated." Fixed by the migration above.
- **`initial.sql` was invisible to the migration system**, and there was **no migration pipeline at all** — CI lints and builds only, with no `db push`, no `config.toml`, and no drift check. All 16 migrations had been applied by hand with an empty history table, so the CLI believed every one was pending; a naive `db push` would have replayed them against objects that already existed. Baselined instead.
- **`unauthorized()` hardcoded HTTP 401**, discarding the status on the auth result, so an unconfigured API answered `401` where it should have been `503`. Caught by a smoke test of the failure paths; replaced with `authFailure()`, which preserves the status.
- **The CodeQL workflow could not match configurations on `main`**, so the code-scanning check failed on every pull request. Fixed by the CI change above. Whether `main`'s configuration comes from this workflow or from GitHub's *Default setup* could not be determined without repository-settings access — if both are configured, they will keep conflicting until one is removed.
