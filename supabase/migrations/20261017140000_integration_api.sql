-- Backing tables for the integration API (openapi/work-sprout.v1.yaml):
-- keys that authenticate external tools, and an ordered log of what happened
-- so those tools can react to it.

-- ---------------------------------------------------------------------------
-- 1. API keys
-- ---------------------------------------------------------------------------

-- Only a SHA-256 hash of the key is stored. Keys are 32 random bytes, so a
-- fast hash is sufficient — there is no low-entropy secret to brute force, and
-- a slow KDF would only add latency to every API request.
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  -- Shown in the UI so a key can be recognised without revealing it.
  prefix text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint api_keys_name_length check (char_length(name) between 1 and 80)
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;

-- Owners manage their own keys. The API route reads this table with the
-- service role, since it has no user session to key RLS off.
drop policy if exists "Users can manage their own API keys" on public.api_keys;
create policy "Users can manage their own API keys"
  on public.api_keys for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 2. Events
-- ---------------------------------------------------------------------------

-- An append-only log. `id` is a monotonic identity, which makes it a natural
-- cursor: readers poll with `after=<last id seen>`. Delivery is therefore
-- at-least-once, and consumers deduplicate on `id`.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- The read pattern is always "this user's events after id N, oldest first".
create index if not exists events_user_id_id_idx on public.events (user_id, id);

alter table public.events enable row level security;

-- Written by trigger, read by the API route with the service role. The select
-- policy lets the app show a user their own activity if it ever needs to.
drop policy if exists "Users can read their own events" on public.events;
create policy "Users can read their own events"
  on public.events for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- 3. The writer
-- ---------------------------------------------------------------------------

-- Events are recorded by trigger rather than from application code, for two
-- reasons: a trigger runs in the same transaction as the change it describes,
-- so an event cannot be lost to a crash between the write and the insert; and
-- it captures every writer, including anyone later using the API.
--
-- SECURITY DEFINER because recording history is a system concern — the insert
-- must succeed regardless of the caller's row-level policies. search_path is
-- empty, so every name below is fully qualified.
--
-- Payloads are built from to_jsonb(NEW/OLD) rather than naming columns, so a
-- schema change cannot break recording. `public_token` is removed: it grants
-- anonymous access to an invoice, and the feed may be relayed to third parties.
create or replace function public.record_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_table text := tg_table_name;
  v_entity text;
  v_row jsonb;
  v_user uuid;
  v_type text;
  v_payload jsonb;
begin
  -- Wrapped so a bug in here can never fail the user's actual write. An event
  -- is a notification about a change, not part of it.
  begin
    -- NEW is unassigned on DELETE and OLD on INSERT, so read from whichever
    -- exists rather than referencing both.
    if tg_op = 'DELETE' then
      v_row := to_jsonb(old);
    else
      v_row := to_jsonb(new);
    end if;

    v_entity := case v_table
      when 'invoices' then 'invoice'
      when 'payments' then 'payment'
      when 'calls' then 'call'
      when 'clients' then 'client'
      when 'expenses' then 'expense'
      else v_table
    end;

    v_user := nullif(v_row ->> 'user_id', '')::uuid;
    v_payload := v_row - 'public_token';

    if tg_op = 'INSERT' then
      v_type := case v_table when 'payments' then 'payment.recorded' else v_entity || '.created' end;
    elsif tg_op = 'DELETE' then
      v_type := v_entity || '.deleted';
    elsif v_table = 'invoices' then
      -- Only the transitions worth reacting to are distinguished from a plain edit.
      if new.status = 'void' and old.status is distinct from 'void' then
        v_type := 'invoice.voided';
      elsif new.sent_at is distinct from old.sent_at and new.sent_at is not null then
        v_type := 'invoice.sent';
      elsif new.status = 'sent' and old.status = 'draft' then
        v_type := 'invoice.sent';
      else
        v_type := 'invoice.updated';
      end if;
    elsif v_table = 'calls' then
      if new.invited_at is distinct from old.invited_at and new.invited_at is not null then
        v_type := 'call.invite_sent';
      elsif new.status is distinct from old.status then
        v_type := 'call.status_changed';
      else
        v_type := 'call.updated';
      end if;
    else
      v_type := v_entity || '.updated';
    end if;

    -- Enrich with the names a tool would otherwise have to look up.
    if v_table in ('invoices', 'payments', 'calls') then
      v_payload := v_payload || jsonb_build_object(
        'client_name',
        (
          select c.name from public.clients c
          where c.id = nullif(v_row ->> 'client_id', '')::uuid
        )
      );
    end if;

    if v_table = 'payments' then
      v_payload := v_payload || jsonb_build_object(
        'invoice_number',
        (
          select i.number from public.invoices i
          where i.id = nullif(v_row ->> 'invoice_id', '')::uuid
        )
      );
    end if;

    if v_user is not null and v_type is not null then
      insert into public.events (user_id, type, payload) values (v_user, v_type, v_payload);
    end if;
  exception when others then
    raise warning 'record_event failed for % (op %): %', v_table, tg_op, sqlerrm;
  end;

  -- AFTER triggers ignore the return value.
  return null;
end;
$fn$;

drop trigger if exists record_event_invoices on public.invoices;
create trigger record_event_invoices
  after insert or update or delete on public.invoices
  for each row execute function public.record_event();

drop trigger if exists record_event_payments on public.payments;
create trigger record_event_payments
  after insert or update or delete on public.payments
  for each row execute function public.record_event();

drop trigger if exists record_event_calls on public.calls;
create trigger record_event_calls
  after insert or update or delete on public.calls
  for each row execute function public.record_event();

drop trigger if exists record_event_clients on public.clients;
create trigger record_event_clients
  after insert or update or delete on public.clients
  for each row execute function public.record_event();

drop trigger if exists record_event_expenses on public.expenses;
create trigger record_event_expenses
  after insert or update or delete on public.expenses
  for each row execute function public.record_event();
