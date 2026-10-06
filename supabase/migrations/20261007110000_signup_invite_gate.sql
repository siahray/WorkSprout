create or replace function public.is_beta_signup(p_email text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.beta_signups where email = lower(p_email)
  );
$$;

revoke all on function public.is_beta_signup(text) from public;
grant execute on function public.is_beta_signup(text) to anon, authenticated;
