-- Admin-driven beta invites. The admin sends an email containing a one-time
-- OTP; only invited emails can complete signup. `invited_at` records that an
-- invite was issued, and `invited_by` who issued it.
alter table public.beta_signups
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

-- Admins can issue/refresh invites (update invited_at/invited_by).
-- The existing "Admins can view all beta signups" SELECT policy is required for
-- an UPDATE to match a row in Postgres RLS. `(select auth.jwt())` keeps the
-- claim lookup a single InitPlan instead of re-evaluating it per row.
drop policy if exists "Admins can update beta signups" on public.beta_signups;
create policy "Admins can update beta signups"
  on public.beta_signups for update
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Same InitPlan optimization for the pre-existing admin SELECT policy.
drop policy if exists "Admins can view all beta signups" on public.beta_signups;
create policy "Admins can view all beta signups"
  on public.beta_signups for select
  to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Signup is now gated by a valid emailed OTP, so the table-membership gate is
-- no longer used.
drop function if exists public.is_beta_signup(text);

-- The Supabase Auth publishable key is public, so anyone could call
-- auth.signInWithOtp directly and self-register, bypassing the admin. This
-- `before-user-created` hook rejects new users unless their email was invited
-- (i.e. the admin upserted a beta_signups row with invited_at set) before the
-- OTP was sent. `security definer` is required so the lookup can read
-- beta_signups past RLS; `set search_path = ''` keeps it safe. Enable the hook
-- in Dashboard -> Authentication -> Auth Hooks -> Before User Created, pointing
-- at this function, otherwise this guard is inert.
create or replace function public.hook_restrict_beta_signup(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_email text;
  allowed boolean;
begin
  target_email := lower(coalesce(event -> 'user' ->> 'email', ''));

  if target_email = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'message', 'A valid email address is required.',
        'http_code', 400
      )
    );
  end if;

  select exists (
    select 1
    from public.beta_signups
    where lower(beta_signups.email) = target_email
      and beta_signups.invited_at is not null
  ) into allowed;

  if allowed then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'WorkSprout is invite-only. Ask to join the beta and we''ll email your invite.',
      'http_code', 403
    )
  );
end;
$$;

-- Supabase Auth runs the hook as supabase_auth_admin; keep it away from the
-- public Data API roles.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_restrict_beta_signup(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_beta_signup(jsonb) from authenticated, anon, public;
