-- Idempotency for the integration API's write endpoints.
--
-- A retrying client is the normal case, not the exception: a tool that times out
-- will try again, and without this a duplicate POST would create a second client
-- or book a second appointment. `addPayment` and `createInvoice` have the same
-- exposure through the app, but they are driven by a human who sees the result;
-- an API caller is not.
--
-- A row is written when a request starts and updated when it finishes, so a
-- replay can be answered from the stored response without re-running anything.

create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Supplied by the caller, typically a UUID.
  key text not null,
  method text not null,
  path text not null,
  -- Hash of method + path + raw body, so the same key reused for a *different*
  -- request is refused rather than answered with an unrelated response.
  request_hash text not null,
  status text not null default 'in_progress',
  response_status integer,
  response_body jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint idempotency_keys_status check (status in ('in_progress', 'completed')),
  constraint idempotency_keys_key_length check (char_length(key) between 1 and 200),
  -- Scoped per user: two accounts may independently choose the same key.
  constraint idempotency_keys_user_key unique (user_id, key)
);

-- Supports pruning; the table is otherwise only ever read by primary key.
create index if not exists idempotency_keys_created_at_idx on public.idempotency_keys (created_at);

alter table public.idempotency_keys enable row level security;

-- Deliberately no policies. RLS with none denies every role, and only the
-- service-role client behind /api/v1 touches this table — so even a compromised
-- session cannot read another account's keys or forge a replay.
--
-- Consequences worth knowing: rows accumulate, and a request that dies mid-flight
-- leaves its key 'in_progress' forever, so that specific key can never be reused
-- (a new key works fine). Prune with:
--   delete from public.idempotency_keys where created_at < now() - interval '30 days';
