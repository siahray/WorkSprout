-- WorkSprout expense tracking: subscriptions, internet, hardware, and other
-- running costs, optionally linked to a project so profit margins can be
-- computed per project and business health overall.
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261012170000_expenses.sql --linked
-- (Remote migration history is intentionally empty, so `supabase db push` is not used.)

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- When set, the cost is attributed to a specific project for margin math.
  project_id uuid references public.projects(id) on delete set null,
  category text not null default 'Other',
  description text not null default '',
  amount numeric(12, 2) not null check (amount > 0),
  spent_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses (user_id);
create index if not exists expenses_project_id_idx on public.expenses (project_id);
create index if not exists expenses_user_spent_on_idx on public.expenses (user_id, spent_on desc);

alter table public.expenses enable row level security;

create policy "Users can manage their own expenses"
  on public.expenses for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);