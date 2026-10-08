-- Timer pause support: an open time entry can be paused.
-- `paused_at` marks the pause currently in progress; `paused_seconds` accumulates
-- finished pauses. Elapsed time is therefore:
--   extract(epoch from coalesce(end_time, now()) - start_time)
--     - paused_seconds
--     - (now() - paused_at) while paused
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261008140000_timer_pause.sql --linked

alter table public.time_entries
  add column if not exists paused_at timestamptz,
  add column if not exists paused_seconds integer not null default 0;

-- ---------------------------------------------------------------------------
-- Timer RPCs (pause-aware)
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
      paused_at = null,
      duration_minutes = greatest(0, round((
        extract(epoch from (now() - start_time))
        - paused_seconds
        - case when paused_at is not null then extract(epoch from (now() - paused_at)) else 0 end
      ) / 60)::int)
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
      paused_at = null,
      duration_minutes = greatest(0, round((
        extract(epoch from (now() - start_time))
        - paused_seconds
        - case when paused_at is not null then extract(epoch from (now() - paused_at)) else 0 end
      ) / 60)::int)
  where id = p_id and end_time is null;
end;
$$;

create or replace function public.pause_timer(p_id uuid)
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

  update public.time_entries
  set paused_at = now()
  where id = p_id
    and user_id = v_user
    and end_time is null
    and paused_at is null;

  if not found then
    raise exception 'timer not found';
  end if;
end;
$$;

create or replace function public.resume_timer(p_id uuid)
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

  update public.time_entries
  set paused_seconds = paused_seconds + greatest(0, round(extract(epoch from (now() - paused_at)))::int),
      paused_at = null
  where id = p_id
    and user_id = v_user
    and end_time is null
    and paused_at is not null;

  if not found then
    raise exception 'timer not paused';
  end if;
end;
$$;

-- Manual edits replace the whole time range, so any pause history is cleared.
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
      paused_at = null,
      paused_seconds = 0,
      duration_minutes = greatest(0, round(extract(epoch from (p_end - p_start)) / 60)::int),
      note = p_note,
      billable = coalesce(p_billable, billable)
  where id = p_id
    and user_id = v_user
    and invoice_id is null
    and end_time is not null;
end;
$$;
