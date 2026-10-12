-- WorkSprout admin console: user management, usage analytics, audit log,
-- a feedback inbox, and broadcast history.
--
-- Everything privileged goes through SECURITY DEFINER functions that verify the
-- caller's `app_metadata.role = 'admin'` claim, so the app never needs the
-- service-role key. Functions are owned by the migration role (postgres), which
-- can read/write auth.users.
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261012120000_admin_console.sql --linked

-- ---------------------------------------------------------------------------
-- 1. Admin claim helper
-- ---------------------------------------------------------------------------

create or replace function public.admin_is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

revoke all on function public.admin_is_admin() from public, anon;
grant execute on function public.admin_is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Feedback inbox
-- ---------------------------------------------------------------------------

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  message text not null,
  page text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feedback_status_check check (status in ('new', 'read', 'resolved')),
  constraint feedback_message_not_blank check (char_length(trim(message)) > 0),
  constraint feedback_message_length check (char_length(message) <= 4000)
);

create index if not exists feedback_status_created_idx on public.feedback (status, created_at desc);

alter table public.feedback enable row level security;

-- Anyone (signed in or not) may send feedback.
drop policy if exists "Anyone can send feedback" on public.feedback;
create policy "Anyone can send feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can read feedback" on public.feedback;
create policy "Admins can read feedback"
  on public.feedback for select
  to authenticated
  using ((select public.admin_is_admin()));

drop policy if exists "Admins can update feedback" on public.feedback;
create policy "Admins can update feedback"
  on public.feedback for update
  to authenticated
  using ((select public.admin_is_admin()))
  with check ((select public.admin_is_admin()));

drop policy if exists "Admins can delete feedback" on public.feedback;
create policy "Admins can delete feedback"
  on public.feedback for delete
  to authenticated
  using ((select public.admin_is_admin()));

drop trigger if exists feedback_set_updated_at on public.feedback;
create trigger feedback_set_updated_at
  before update on public.feedback
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Audit log
-- ---------------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  action text not null,
  target text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "Admins can read the audit log" on public.admin_audit_log;
create policy "Admins can read the audit log"
  on public.admin_audit_log for select
  to authenticated
  using ((select public.admin_is_admin()));

drop policy if exists "Admins can append to the audit log" on public.admin_audit_log;
create policy "Admins can append to the audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check ((select public.admin_is_admin()));

drop policy if exists "Admins can prune the audit log" on public.admin_audit_log;
create policy "Admins can prune the audit log"
  on public.admin_audit_log for delete
  to authenticated
  using ((select public.admin_is_admin()));

-- ---------------------------------------------------------------------------
-- 4. Broadcast history
-- ---------------------------------------------------------------------------

create table if not exists public.admin_broadcasts (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  subject text not null,
  body text not null,
  audience text not null,
  recipient_count integer not null default 0,
  provider text,
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now()
);

create index if not exists admin_broadcasts_created_idx on public.admin_broadcasts (created_at desc);

alter table public.admin_broadcasts enable row level security;

drop policy if exists "Admins can read broadcasts" on public.admin_broadcasts;
create policy "Admins can read broadcasts"
  on public.admin_broadcasts for select
  to authenticated
  using ((select public.admin_is_admin()));

drop policy if exists "Admins can record broadcasts" on public.admin_broadcasts;
create policy "Admins can record broadcasts"
  on public.admin_broadcasts for insert
  to authenticated
  with check ((select public.admin_is_admin()));

-- ---------------------------------------------------------------------------
-- 5. Admins may remove beta signups
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can delete beta signups" on public.beta_signups;
create policy "Admins can delete beta signups"
  on public.beta_signups for delete
  to authenticated
  using ((select public.admin_is_admin()));

-- ---------------------------------------------------------------------------
-- 6. User management RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  full_name text,
  business_name text,
  app_role text,
  banned boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  projects bigint,
  clients bigint,
  invoices bigint,
  todos bigint,
  time_minutes bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.admin_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    u.id,
    u.email::text,
    p.full_name,
    p.business_name,
    coalesce(u.raw_app_meta_data ->> 'role', 'user'),
    (u.banned_until is not null and u.banned_until > now()),
    u.last_sign_in_at,
    u.created_at,
    (select count(*) from public.projects pr where pr.user_id = u.id),
    (select count(*) from public.clients c where c.user_id = u.id),
    (select count(*) from public.invoices i where i.user_id = u.id),
    (select count(*) from public.todos t where t.user_id = u.id),
    (select coalesce(sum(te.duration_minutes), 0) from public.time_entries te where te.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_admin_role(p_user uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_admins integer;
begin
  if not public.admin_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if not p_is_admin then
    if v_actor = p_user then
      raise exception 'You cannot remove your own admin access.' using errcode = '22023';
    end if;

    select count(*) into v_admins
    from auth.users u
    where coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin';

    if v_admins <= 1 then
      raise exception 'At least one admin must remain.' using errcode = '22023';
    end if;
  end if;

  update auth.users u
  set raw_app_meta_data =
    coalesce(u.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', case when p_is_admin then 'admin' else 'user' end)
  where u.id = p_user;

  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_admin_role(uuid, boolean) from public, anon;
grant execute on function public.admin_set_admin_role(uuid, boolean) to authenticated;

create or replace function public.admin_set_user_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if not public.admin_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if p_banned and v_actor = p_user then
    raise exception 'You cannot suspend your own account.' using errcode = '22023';
  end if;

  update auth.users u
  set banned_until = case when p_banned then now() + interval '100 years' else null end
  where u.id = p_user;

  if not found then
    raise exception 'User not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_user_banned(uuid, boolean) from public, anon;
grant execute on function public.admin_set_user_banned(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Usage analytics RPC
-- ---------------------------------------------------------------------------

create or replace function public.admin_usage_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.admin_is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'users', (select count(*) from auth.users),
    'admins', (select count(*) from auth.users u where coalesce(u.raw_app_meta_data ->> 'role', '') = 'admin'),
    'signups', (select count(*) from public.beta_signups),
    'signups_7d', (select count(*) from public.beta_signups s where s.created_at >= now() - interval '7 days'),
    'signups_30d', (select count(*) from public.beta_signups s where s.created_at >= now() - interval '30 days'),
    'invited', (select count(*) from public.beta_signups s where s.invited_at is not null),
    'clients', (select count(*) from public.clients),
    'projects', (select count(*) from public.projects),
    'active_projects', (select count(*) from public.projects p where p.status = 'active'),
    'tasks', (select count(*) from public.tasks),
    'subtasks', (select count(*) from public.subtasks),
    'todos', (select count(*) from public.todos),
    'invoices', (select count(*) from public.invoices),
    'payments', (select count(*) from public.payments),
    'time_entries', (select count(*) from public.time_entries),
    'time_minutes', (select coalesce(sum(duration_minutes), 0) from public.time_entries),
    'feedback_total', (select count(*) from public.feedback),
    'feedback_new', (select count(*) from public.feedback f where f.status = 'new')
  ) into v;

  return v;
end;
$$;

revoke all on function public.admin_usage_stats() from public, anon;
grant execute on function public.admin_usage_stats() to authenticated;
