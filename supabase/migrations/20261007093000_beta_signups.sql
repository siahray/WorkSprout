-- Beta tester signups gathered from the landing page (no auth account).
create table if not exists public.beta_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  profession text,
  source text not null default 'beta-landing',
  created_at timestamptz not null default now()
);

alter table public.beta_signups enable row level security;

drop policy if exists "Admins can view all beta signups" on public.beta_signups;
create policy "Admins can view all beta signups"
  on public.beta_signups for select
  to authenticated
  using (coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin');

drop policy if exists "Anyone can join the beta" on public.beta_signups;
create policy "Anyone can join the beta"
  on public.beta_signups for insert
  to anon, authenticated
  with check (true);
