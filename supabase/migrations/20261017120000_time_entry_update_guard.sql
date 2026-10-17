-- update_manual_entry silently no-opped when its WHERE clause matched nothing:
-- a stale edit form, an entry invoiced since the page loaded, or an entry
-- deleted in another tab. The function returns void, so the caller reported
-- "Time entry updated." regardless.
--
-- The sibling timer functions (start_timer/pause_timer/resume_timer) all raise
-- when nothing matched. This brings update_manual_entry in line, so the server
-- action can surface a real error instead of a false success.

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

  if not found then
    raise exception 'time entry not found';
  end if;
end;
$$;
