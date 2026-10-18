-- Idempotency for the app's own money mutations: `addPayment` and `createInvoice`.
--
-- The integration API already has `idempotency_keys`, but that table is RLS
-- deny-all on purpose — only the service-role client may touch it. App server
-- actions authenticate with the user's session, so they cannot write there and
-- must not be given a back door to. This is the parallel mechanism, scoped the
-- way the rest of the app is scoped: `auth.uid() = user_id`.
--
-- A human resubmits in ways a machine does not — double-click, back button,
-- a network retry — and each one was writing a second row, double-counting the
-- money. The key is minted by the form when it mounts and rotated after every
-- successful submit, so it identifies one *intent*, not one page visit.

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Minted client-side. Unique per user, so two accounts never collide.
  key text not null,
  -- What a replay should return, e.g. { "ok": "Payment recorded." } or
  -- { "redirectTo": "/invoices/<id>" }. Null while the first attempt is still
  -- in flight, or if it died before finishing.
  response jsonb,
  created_at timestamptz not null default now(),
  constraint form_submissions_user_key unique (user_id, key),
  constraint form_submissions_key_length check (char_length(key) between 1 and 200)
);

-- Supports pruning; rows are otherwise only ever read by (user_id, key).
create index if not exists form_submissions_created_at_idx on public.form_submissions (created_at);

alter table public.form_submissions enable row level security;

-- Unlike idempotency_keys this table is deliberately readable and writable by
-- its owner: the app has no service role, only a session. The unique constraint
-- is what actually serialises a double-submit, so the policy is the usual
-- per-user scoping rather than anything special.
create policy "Users can manage their own form submissions"
  on public.form_submissions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Prune with:
--   delete from public.form_submissions where created_at < now() - interval '30 days';
