-- WorkSprout freelancing core: clients -> projects -> tasks -> time -> invoices -> payments.
-- Currency is fixed to PHP (₱). Money is numeric(12,2); hours use numeric(10,2).
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261008120000_freelancing_core.sql --linked
-- (Remote migration history is intentionally empty, so `supabase db push` is not used.)

-- ---------------------------------------------------------------------------
-- 1. Extend existing tables
-- ---------------------------------------------------------------------------

-- Business / tax details live on the profile and are snapshotted onto invoices.
alter table public.profiles
  add column if not exists business_address text,
  add column if not exists business_phone text,
  add column if not exists tax_rate numeric(5, 2) not null default 0,
  add column if not exists tax_label text not null default 'VAT';

alter table public.clients
  add column if not exists address text,
  add column if not exists tax_id text,
  add column if not exists notes text;

alter table public.projects
  add column if not exists description text;

-- ---------------------------------------------------------------------------
-- 2. Invoices
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft', 'sent', 'void');
  end if;
end $$;

create table if not exists public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete restrict not null,
  project_id uuid references public.projects(id) on delete set null,
  number text not null,
  status invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'PHP',
  -- Snapshot of the profile tax settings at creation time so history is stable.
  tax_rate numeric(5, 2) not null default 0,
  tax_label text not null default 'VAT',
  subtotal numeric(12, 2) not null default 0,
  tax_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);

create table if not exists public.invoice_items (
  id uuid default gen_random_uuid() primary key,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  -- Set when the line was generated from tracked time; cleared if the entry is removed.
  time_entry_id uuid references public.time_entries(id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_rate numeric(12, 2) not null default 0,
  amount numeric(12, 2) generated always as (round(quantity * unit_rate, 2)) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  invoice_id uuid references public.invoices(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at date not null default current_date,
  method text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. Time entries gain an owner, a billable flag, and an invoice link
-- ---------------------------------------------------------------------------

alter table public.time_entries
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists note text,
  add column if not exists billable boolean not null default true,
  add column if not exists invoice_id uuid references public.invoices(id) on delete set null;

-- Backfill the owner from the task's project, then require it.
update public.time_entries te
set user_id = p.user_id
from public.tasks t
join public.projects p on p.id = t.project_id
where te.task_id = t.id
  and te.user_id is null;

-- Close any stray open timers before enforcing "one running timer per user".
update public.time_entries
set end_time = start_time,
    duration_minutes = coalesce(duration_minutes, 0)
where end_time is null;

alter table public.time_entries alter column user_id set not null;

-- A user can only have a single timer running at a time.
create unique index if not exists time_entries_one_running_per_user
  on public.time_entries (user_id)
  where end_time is null;

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

create index if not exists clients_user_id_idx on public.clients (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_client_id_idx on public.projects (client_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists time_entries_user_id_idx on public.time_entries (user_id);
create index if not exists time_entries_task_id_idx on public.time_entries (task_id);
create index if not exists time_entries_invoice_id_idx on public.time_entries (invoice_id);
create index if not exists time_entries_unbilled_idx
  on public.time_entries (user_id)
  where invoice_id is null and billable;

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_project_id_idx on public.invoices (project_id);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_time_entry_id_idx on public.invoice_items (time_entry_id);
create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_invoice_id_idx on public.payments (invoice_id);

-- ---------------------------------------------------------------------------
-- 5. updated_at maintenance for invoices
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

-- Replace the task-join policy on time entries with a direct owner check.
drop policy if exists "Users can manage time entries of their tasks" on public.time_entries;
drop policy if exists "Users can manage their own time entries" on public.time_entries;
create policy "Users can manage their own time entries"
  on public.time_entries for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their own invoices" on public.invoices;
create policy "Users can manage their own invoices"
  on public.invoices for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage payments on their invoices" on public.payments;
create policy "Users can manage payments on their invoices"
  on public.payments for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage items of their invoices" on public.invoice_items;
create policy "Users can manage items of their invoices"
  on public.invoice_items for all
  to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Derived invoice balances
-- ---------------------------------------------------------------------------

-- `security_invoker` keeps the caller's rights, so RLS on invoices/payments still applies.
-- The derived `status` folds the base status together with payments:
--   draft -> draft, void -> void, else paid / partial / sent.
drop view if exists public.invoice_balances;
create view public.invoice_balances
with (security_invoker = true) as
select
  i.id,
  i.user_id,
  i.client_id,
  i.project_id,
  i.number,
  i.issue_date,
  i.due_date,
  i.currency,
  i.tax_rate,
  i.tax_label,
  i.subtotal,
  i.tax_amount,
  i.total,
  i.notes,
  i.created_at,
  i.updated_at,
  i.status as base_status,
  (select c.name from public.clients c where c.id = i.client_id) as client_name,
  (select pr.name from public.projects pr where pr.id = i.project_id) as project_name,
  coalesce(sum(p.amount), 0)::numeric(12, 2) as amount_paid,
  (i.total - coalesce(sum(p.amount), 0))::numeric(12, 2) as balance,
  case
    when i.status = 'void' then 'void'
    when i.status = 'draft' then 'draft'
    when coalesce(sum(p.amount), 0) >= i.total then 'paid'
    when coalesce(sum(p.amount), 0) > 0 then 'partial'
    else 'sent'
  end as status
from public.invoices i
left join public.payments p on p.invoice_id = i.id
group by i.id;

-- ---------------------------------------------------------------------------
-- 8. Timer helpers
-- ---------------------------------------------------------------------------

-- Start a timer for a task, first stopping any timer already running for this
-- user (enforcing one running timer). Runs as the invoker, so RLS still applies,
-- and the task is validated to belong to the caller so an entry can never point
-- at another user's task.
create or replace function public.start_timer(p_task_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid;
  v_id uuid;
begin
  v_user := (select auth.uid());

  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if not exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.id = p_task_id and p.user_id = v_user
  ) then
    raise exception 'task not found';
  end if;

  update public.time_entries
  set end_time = now(),
      duration_minutes = greatest(0, round(extract(epoch from (now() - start_time)) / 60)::int)
  where user_id = v_user and end_time is null;

  insert into public.time_entries (task_id, user_id, start_time)
  values (p_task_id, v_user, now())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.stop_timer(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.time_entries
  set end_time = now(),
      duration_minutes = greatest(0, round(extract(epoch from (now() - start_time)) / 60)::int)
  where id = p_id and end_time is null;
end;
$$;

-- Manual entries take naive (wall-clock) timestamps that are interpreted in
-- Asia/Manila, so the client never has to do timezone math. The task must
-- belong to the caller.
create or replace function public.add_manual_entry(
  p_task_id uuid,
  p_start timestamp,
  p_end timestamp,
  p_note text,
  p_billable boolean
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid;
  v_id uuid;
begin
  v_user := (select auth.uid());

  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid time range';
  end if;

  if not exists (
    select 1
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.id = p_task_id and p.user_id = v_user
  ) then
    raise exception 'task not found';
  end if;

  insert into public.time_entries (task_id, user_id, start_time, end_time, duration_minutes, note, billable)
  values (
    p_task_id,
    v_user,
    p_start at time zone 'Asia/Manila',
    p_end at time zone 'Asia/Manila',
    greatest(0, round(extract(epoch from (p_end - p_start)) / 60)::int),
    p_note,
    coalesce(p_billable, true)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Only unbilled entries can be edited.
create or replace function public.update_manual_entry(
  p_id uuid,
  p_start timestamp,
  p_end timestamp,
  p_note text,
  p_billable boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_user uuid;
begin
  v_user := (select auth.uid());

  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_start is null or p_end is null or p_end <= p_start then
    raise exception 'invalid time range';
  end if;

  update public.time_entries
  set start_time = p_start at time zone 'Asia/Manila',
      end_time = p_end at time zone 'Asia/Manila',
      duration_minutes = greatest(0, round(extract(epoch from (p_end - p_start)) / 60)::int),
      note = p_note,
      billable = coalesce(p_billable, billable)
  where id = p_id
    and user_id = v_user
    and invoice_id is null
    and end_time is not null;
end;
$$;
