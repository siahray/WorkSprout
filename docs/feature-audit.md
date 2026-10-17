# WorkSprout — Feature Audit & Automation Readiness

**Date:** 17 October 2026
**Branches:** `feat/correction-paths`, `feat/integration-api`, `fix/codeql-configuration` — all pushed, none merged.
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
| Phases | ✅ | ✅ | ❌ | ✅ |
| Tasks | ✅ | ✅ | status only | ✅ |
| Subtasks | ✅ | ✅ | status only | ✅ |
| Time entries | ✅ | ✅ | manual only | ✅ |
| Calls | ✅ | ✅ | status only | ✅ |
| Todos | ✅ | ✅ | toggle only | ✅ |

Invoices used to be **immutable** once created — no `updateInvoice`, no line-item editing, no correcting a typo — and expenses and payments had no correction path either. That was the largest basic-feature gap, and the one automation collides with hardest: automated writes with no correction path make every bad write permanent. Those three paths now exist.

### 1.2 There is a programmatic surface now, but it only reads

| Automation primitive | Status |
|---|---|
| Authenticated public API | ⚠️ reads only — `GET /api/v1/me`, `GET /api/v1/events`. No write endpoint. |
| User API keys / tokens | ✅ `api_keys` — hashed, shown once, managed in Settings → Automation |
| Event emitter | ✅ `events` — written by triggers on invoices, payments, calls, clients, expenses |
| Webhook *delivery* | ❌ pull feed only; no push, no retry worker, no signing |
| Scheduled jobs | ❌ no pg_cron, no queue |
| Idempotency keys on mutations | ❌ `addPayment`, `createInvoice` still double-write on retry |
| Tests | ❌ zero test files |
| CI | lint + build only (plus CodeQL + ZAP) — no test step, because there is nothing to run |

Every app mutation is still a Next.js server action — a private RPC bound to a session cookie. The `/api/v1` routes are the first surface an external caller can authenticate to, but they are read-only, so **automation can observe this system and still cannot change it.** The write half is the remaining seam.

### 1.3 The good precedent already exists

The concurrency-sensitive paths are partly safe already: the timer runs through DB RPCs (`start_timer` / `pause_timer` / `resume_timer` / `stop_timer`) and invoice numbering uses collision retry. The team already knows the pattern of pushing invariants into Postgres — that is the precedent to follow for automation rather than doing it in TypeScript.

The event log follows it: `events` is written by an `after insert or update or delete` **trigger**, not by application code. The trigger runs in the same transaction as the change it describes, so an event cannot be lost to a crash between the write and the insert, and every writer is captured — including any added later. Its body is wrapped so a fault in recording can never fail the user's actual write.

---

## 2. Every basic feature, laid out

### Auth & accounts
- ✅ Login, logout, invite-only signup with OTP, waitlist, DB-level signup gate
- ❌ Password reset / forgot-password page (Supabase-hosted only)
- ❌ Email change flow, account deletion, session/device management
- ❌ MFA

### Clients
- ✅ CRUD, detail page, per-client outstanding balance
- ❌ Archive vs hard delete (delete is destructive and cascading)
- ❌ Client-facing portal or login
- ❌ Contact persons / multiple emails per client — **this is what blocks CRM sync**; `clients` holds a single `email`, so there is no contact to map a CRM to

### Projects
- ✅ CRUD, hourly + fixed rates, statuses, phases, tasks, subtasks, progress
- ❌ Rename/reorder tasks, phases, subtasks
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
- ❌ Receipt attachment (attachments support projects + invoices only)
- ❌ Recurring/subscription expenses
- ❌ Mileage, reimbursable flag, vendor field
- ❌ Export (CSV / accounting)

### Calls
- ✅ Scheduling, statuses, email invite with ICS, public page, timezone-correct
- ❌ Reschedule/edit, reminders before the call, two-way calendar sync
- ❌ Recording/notes capture, follow-up tasks
- ❌ Not creatable through the API yet — an appointment cannot be booked from outside the app

### Attachments
- ✅ Direct-to-Storage upload, signed URLs, 10 MB cap, type allowlist, cleanup on delete
- ❌ Expenses and clients as parents
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
- ✅ RLS on user tables, `updated_at` triggers, admin audit log, three CI workflows
- ❌ **Tests of any kind**
- ❌ Rate limiting, pagination (lists load fully), search on expenses/invoices
- ❌ Observability beyond `console.error`
- ✅ Migration baseline — `config.toml` now exists and every migration is recorded in the remote history (0 pending). Still no drift check in CI.
- ❌ Backups/restore runbook

---

## 3. What automation needs first

Ordered by dependency, not preference.

1. ~~**Update paths** — `updateInvoice`, `updateExpense`, `updatePayment`, plus line-item editing.~~ **Done** — all four exist as of the changelog below. Automation without correction is a liability, so this was the blocker.
2. **An authenticated API surface** — ⚠️ **half done.** `api_keys` authenticate `/api/v1`, and the event feed is readable. The *write* half (create client, book appointment, raise invoice) does not exist, so nothing external can change data yet. Target: `openapi/work-sprout.v1.yaml`.
3. **Idempotency** — ❌ still absent, and the immediate next requirement for step 2's write endpoints: a polling or retrying client must not double-bill.
4. ~~**Event/outbox table** — one `events` table written in the same transaction as mutations.~~ **Done** — `events`, written by triggers, which is a true outbox. It gives a *pull* feed; **push webhooks are not built** and would need a delivery worker plus a scheduler.
5. **A test harness** — at minimum integration tests for money paths. There is no safety net for automation today. Still ❌.
6. **Then** recurring invoices, dunning, reminders — consumers of step 4.

---

## 4. Open questions before committing to automation

1. ~~**What does "automation" mean here**~~ **Answered:** emails, CRMs and appointments, delivered by an **external tool** (n8n / Make / Zapier) that WorkSprout feeds. WorkSprout is not becoming a CRM, booking system or email marketing suite; it exposes what happened and lets the external tool own those domains. CRM sync is deferred, and blocked on the missing contacts model (see Clients above).
2. **Who is the actor** — you, your clients, or a machine? Client-facing automation implies a client portal, which does not exist and is a far bigger build than an API.
3. **Which single manual task hurts most right now?** "I forget to send invoices" → dunning + scheduler, not an API. "Entering expenses" → receipt parsing, which needs storage parents extended first.
4. **Will you freeze features to build the platform layer** (write API, events, tests)? Automation on a system with no tests means every bug becomes a permanent data bug. The write endpoints are the next step and are still unbuilt.
5. **Is PHP-only, single-user, no-team deliberate** or accidental? It decides whether automation must be tenant-aware from day one. It also decides whether a single `clients.email` is a real limitation or a deliberate one.
6. **What is the success metric** — hours saved per week, invoices sent on time, or data captured without touch?

---

## Appendix — Evidence

**Route handlers (6)**

| Path | Purpose |
|---|---|
| `app/i/[token]/pdf/route.ts` | public invoice PDF |
| `app/c/[token]/ics/route.ts` | public calendar file |
| `app/attachments/[id]/route.ts` | signed-URL redirect |
| `app/admin/(console)/signups-export/route.ts` | admin CSV export |
| `app/api/v1/events/route.ts` | integration API — poll the event log |
| `app/api/v1/me/route.ts` | integration API — verify an API key |

**Server actions by module**

| Module | Actions |
|---|---|
| Clients | `createClient`, `updateClient`, `deleteClient` |
| Projects | `createProject`, `updateProject`, `deleteProject`, `addPhase`, `deletePhase`, `addTask`, `setTaskStatus`, `deleteTask`, `addSubtask`, `setSubtaskStatus`, `deleteSubtask` |
| Time | `startTimer`, `pauseTimer`, `resumeTimer`, `stopTimer`, `addManualEntry`, `updateManualEntry`, `deleteTimeEntry` |
| Invoices | `createInvoice`, `updateInvoice`, `sendInvoice`, `markInvoiceSent`, `voidInvoice`, `deleteInvoice`, `addPayment`, `updatePayment`, `deletePayment` |
| Expenses | `createExpense`, `updateExpense`, `deleteExpense` |
| Focus | `createTodo`, `toggleTodo`, `addToToday`, `deleteTodo`, `createCall`, `deleteCall`, `setCallStatus`, `sendCallInvite` |
| Attachments | `recordAttachment`, `deleteAttachment` |
| Settings | `updateProfile`, `changePassword`, `createApiKey`, `revokeApiKey` |
| Feedback | `submitFeedback` |
| Admin | `sendInvite`, `login`, `logout`, `deleteSignup`, `bulkDeleteSignups`, `setUserRole`, `setUserBanned`, `sendBroadcast`, `updateFeedbackStatus`, `deleteFeedback` |

**Database functions / RPCs**

`handle_new_user`, `add_manual_entry`, `update_manual_entry`, `admin_is_admin`, `admin_list_users`, `admin_set_admin_role`, `admin_set_user_banned`, `admin_usage_stats`, `call_public`, `invoice_public`, `hook_restrict_beta_signup`, `is_beta_signup`, `pause_timer`, `resume_timer`, `start_timer`, `stop_timer`, `set_updated_at`, `record_event`

**Database triggers**

`record_event` on `invoices`, `payments`, `calls`, `clients`, `expenses` (`after insert or update or delete`, `security definer`). One `set_updated_at` trigger per mutable table.

**Explicitly not present:** webhook delivery or a retry worker, pg_cron or queue usage, realtime subscriptions, rate limiting, pagination, any test file.

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

Deliberate limits: **no write endpoints**, and **no push webhooks** — delivery needs a scheduler and a retry worker this deployment does not have, so the feed is pull-only. `SUPABASE_SERVICE_ROLE_KEY` is required and is unset, so `/api/v1` returns `503 not_configured` until it is added.

Two decisions worth keeping: the API is **not** a passthrough to the database — a generic Postgres connector would bypass invoice numbering, the generated `amount` column, the tax snapshot, derived status and RLS — and the service-role client it uses must scope every query to the key's `user_id` explicitly, since it bypasses RLS.

### CI fix (branch `fix/codeql-configuration`)

| Change | Notes |
|---|---|
| CodeQL language identifier | `languages: javascript, typescript` → `javascript-typescript`, plus an explicit `category`. TypeScript is analysed by the JavaScript extractor; the legacy and combined names are treated as *different* configurations, which made the "Code scanning results" check report "1 configuration not found" and fail every PR. |

### Audit corrections

- **"Editing timer-generated entries" was never missing.** `update_manual_entry` only requires a stopped, unbilled entry, and the time list filters out running timers. The ❌ came from inferring behaviour from the function's name instead of reading its SQL.
- **`invoice_items.time_entry_id` is dormant.** The column exists, is indexed, has `on delete set null` and a comment promising line-level provenance to tracked time — but nothing in `app/` or `lib/` ever writes it. Billing groups many entries into one line, so a single FK cannot express the relationship; the design changed and the column was left behind. Consequence: **you cannot tell which line on an existing invoice came from tracked time.** The editor therefore replaces lines without touching time links, and releasing hours back to the unbilled pool remains void's job.

### Bugs found while doing this

- **`update_manual_entry` reported success for writes that never happened.** It had no `if not found then raise`, unlike `start_timer`/`pause_timer`/`resume_timer`. A stale edit form, an entry invoiced since the page loaded, or one deleted in another tab returned void, and the action still answered "Time entry updated." Fixed by the migration above.
- **`initial.sql` was invisible to the migration system**, and there was **no migration pipeline at all** — CI lints and builds only, with no `db push`, no `config.toml`, and no drift check. All 16 migrations had been applied by hand with an empty history table, so the CLI believed every one was pending; a naive `db push` would have replayed them against objects that already existed. Baselined instead.
- **`unauthorized()` hardcoded HTTP 401**, discarding the status on the auth result, so an unconfigured API answered `401` where it should have been `503`. Caught by a smoke test of the failure paths; replaced with `authFailure()`, which preserves the status.
- **The CodeQL workflow could not match configurations on `main`**, so the code-scanning check failed on every pull request. Fixed by the CI change above. Whether `main`'s configuration comes from this workflow or from GitHub's *Default setup* could not be determined without repository-settings access — if both are configured, they will keep conflicting until one is removed.
