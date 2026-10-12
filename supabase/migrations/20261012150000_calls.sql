-- Scheduled calls with clients, plus a public token for the invitation page.
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261012150000_calls.sql --linked

do $$
begin
  if not exists (select 1 from pg_type where typname = 'call_status') then
    create type call_status as enum ('scheduled', 'completed', 'cancelled');
  end if;
end $$;

create table if not exists public.calls (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null,
  -- Stored as UTC; the app renders it in Asia/Manila.
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 1440),
  location text,
  notes text,
  status call_status not null default 'scheduled',
  public_token uuid not null default gen_random_uuid(),
  invited_at timestamptz,
  invited_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists calls_public_token_idx on public.calls (public_token);
create index if not exists calls_user_id_idx on public.calls (user_id);
create index if not exists calls_client_id_idx on public.calls (client_id);
create index if not exists calls_user_scheduled_idx on public.calls (user_id, scheduled_at);

drop trigger if exists calls_set_updated_at on public.calls;
create trigger calls_set_updated_at
  before update on public.calls
  for each row execute procedure public.set_updated_at();

alter table public.calls enable row level security;

drop policy if exists "Users can manage their own calls" on public.calls;
create policy "Users can manage their own calls"
  on public.calls for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Public read by token (the client's invitation page)
-- ---------------------------------------------------------------------------

create or replace function public.call_public(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'call', jsonb_build_object(
      'title', c.title,
      'scheduled_at', c.scheduled_at,
      'duration_minutes', c.duration_minutes,
      'location', c.location,
      'notes', c.notes,
      'status', c.status::text
    ),
    'client', jsonb_build_object(
      'name', cl.name,
      'company', cl.company,
      'email', cl.email
    ),
    'business', jsonb_build_object(
      'business_name', p.business_name,
      'full_name', p.full_name,
      'business_phone', p.business_phone,
      'email', p.email
    )
  )
  from public.calls c
  left join public.clients cl on cl.id = c.client_id
  join public.profiles p on p.id = c.user_id
  where c.public_token = p_token;
$$;

revoke all on function public.call_public(uuid) from public;
grant execute on function public.call_public(uuid) to anon, authenticated;
