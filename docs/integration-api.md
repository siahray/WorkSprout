# Integration API

Let an external automation tool — n8n, Make, Zapier, a cron script — react to
what happens in WorkSprout: send an email when a payment lands, add an
appointment to a CRM, nudge an overdue invoice.

The machine-readable contract is [`openapi/work-sprout.v1.yaml`](../openapi/work-sprout.v1.yaml).
Import that file into your tool to generate its actions; this page covers setup
and the parts that need a decision.

## Why an API and not the database connector

Zapier and Make both offer a generic Supabase/Postgres connector that reads and
writes tables directly. Do not use it here. Writing tables straight bypasses
every rule the application enforces:

- invoice numbering (`INV-0001` is allocated, not chosen),
- `invoice_items.amount`, which is a **generated** column,
- the tax snapshot taken when an invoice is issued,
- invoice status, which is *derived* from payments rather than stored,
- row-level security scoping.

Records written that way look fine in the database and render wrong — or not at
all — in the app. This API is the supported surface.

## Setup

1. **Add the service-role key.** The API has no user session, so it resolves the
   key's owner with the service role. In `.env`:

   ```
   SUPABASE_SERVICE_ROLE_KEY=<Project Settings -> API -> service_role secret>
   ```

   This key **bypasses row-level security**. It is read only on the server and
   must never be exposed to the browser or committed. Until it is set, every
   `/api/v1` request returns `503 not_configured`.

2. **Create a key.** Settings → Automation → API keys. Name it after where it
   will be used. The key is shown **once**; only a SHA-256 hash is stored, so a
   lost key must be revoked and replaced.

3. **Test the connection.** Call `GET /api/v1/me` with the key — a `200` means
   it is valid and unrevoked.

   ```bash
   curl http://localhost:3000/api/v1/me \
     -H "Authorization: Bearer wsp_live_…"
   ```

## Polling for events

There is no push/webhook delivery in v1, deliberately: it would need a scheduler
and a retry worker this deployment does not have. Poll instead.

```bash
curl "http://localhost:3000/api/v1/events?after=0&limit=100" \
  -H "Authorization: Bearer wsp_live_…"
```

```json
{
  "events": [
    {
      "id": 1041,
      "type": "payment.recorded",
      "created_at": "2026-10-17T04:12:33.481Z",
      "payload": {
        "id": "8c2f5b1a-…",
        "invoice_id": "5e7d1c94-…",
        "invoice_number": "INV-0007",
        "client_id": "1b4c7d2e-…",
        "client_name": "Northwind Trading",
        "amount": 12500,
        "paid_at": "2026-10-17",
        "method": "Bank transfer"
      }
    }
  ],
  "has_more": false,
  "next": 1041
}
```

**Keep `next` as your cursor.** Event ids come from one monotonic sequence, so
`after=<cursor>` is exact: re-running it returns the same events rather than
skipping them. That makes polling safe to retry, and means **delivery is
at-least-once** — deduplicate on the event `id` before acting, so a retry does
not send a second email.

Loop while `has_more` is true, then stop. Filter with `type=payment.recorded` if
a workflow only cares about one thing.

## Event types

| Event | Fires when |
| --- | --- |
| `invoice.created` | an invoice is issued a number |
| `invoice.updated` | a draft's details or lines change |
| `invoice.sent` | an invoice is sent to the client |
| `invoice.voided` | an invoice is voided |
| `invoice.deleted` | an invoice is deleted |
| `payment.recorded` | a payment is added against an invoice |
| `payment.updated` / `payment.deleted` | a payment is corrected or removed |
| `call.created` | an appointment is booked |
| `call.updated` | an appointment's details change |
| `call.status_changed` | an appointment changes status |
| `call.invite_sent` | a calendar invite is emailed |
| `call.deleted` | an appointment is removed |
| `client.created` / `client.updated` / `client.deleted` | a client changes |
| `expense.created` / `expense.updated` / `expense.deleted` | an expense changes |

Payloads carry identifiers plus the names a workflow would otherwise look up
(`client_name`, `invoice_number`). New fields may be added over time — ignore
unknown keys rather than rejecting them. `public_token` is stripped on purpose:
it grants anonymous access to an invoice and has no business in a feed that may
be relayed onward.

## Writing

Two endpoints create records, both returning `201` with the new `id`:

| Endpoint | Creates |
| --- | --- |
| `POST /api/v1/clients` | a client |
| `POST /api/v1/calls` | an appointment (a "call") |

**Always send `Idempotency-Key`** — any unique string, a UUID per logical
operation:

```bash
curl -X POST http://localhost:3000/api/v1/calls \
  -H "Authorization: Bearer wsp_live_…" \
  -H "Idempotency-Key: 8f2b0f9c-6d1e-4b3a-9c77-2f5a1d0e7c34" \
  -H "Content-Type: application/json" \
  -d '{
        "title": "Discovery call",
        "scheduled_at": "2026-10-20T06:00:00.000Z",
        "duration_minutes": 45
      }'
```

Retrying is unavoidable — a tool that times out will try again — and without the
header a retry books a second appointment. With it:

- a new key runs the request and records the response;
- the same key with the **same** body returns the recorded response, without
  acting again;
- the same key with a **different** body returns `409 idempotency_conflict`;
- a key still running returns `409 request_in_progress`.

After a `409`, retry with a **new** key. Keys are scoped per account, so two
tools cannot collide.

`scheduled_at` is an ISO 8601 instant, stored in UTC; the app renders it in
Asia/Manila. `duration_minutes` defaults to 30. A `client_id` must belong to the
same account or the request is rejected.

Created records still emit events (`client.created`, `call.created`), so a write
is visible on the feed — which is how you would trigger a confirmation email.

Validation lives in `lib/api-mutations.ts` and is shared with the app's own forms,
so a rule cannot apply to one path and not the other.

## What is not built yet

Writes cover **clients and appointments only**. A tool cannot create a project,
log time, or raise an invoice, and nothing can be updated or deleted — creates
only.

Adding an endpoint means adding a function to `lib/api-mutations.ts` and a thin
route under `app/api/v1/`; the auth, idempotency, body-parsing and error layers
are already generic.

Also still absent: **push webhooks** (the feed is pull-only, so delivery latency
is your poll interval), rate limiting, and pagination.

Events, by contrast, are complete for the tables that exist: recorded by database
triggers on `invoices`, `payments`, `calls`, `clients` and `expenses`, so they
capture every write path. The trigger runs in the same transaction as the change
it records, and is wrapped so a fault in event recording can never fail your
actual work.

## Retention

Neither table is pruned by the app.

`events` grows forever. At this scale that is negligible, but if it ever matters,
set a scheduled `delete from public.events where created_at < now() - interval
'90 days'` — after checking that every consumer's cursor has moved past the point
being deleted.

`idempotency_keys` grows one row per write. A request that dies mid-flight leaves
its key marked `in_progress` forever, so that specific key can never be reused —
a new key works fine, so this is a leak rather than a failure. Prune the same
way, and more aggressively than events:

```sql
delete from public.idempotency_keys where created_at < now() - interval '30 days';
```

Prune only keys older than your longest plausible retry window, since deleting a
row forgets that a request already ran.
