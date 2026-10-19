-- Summary stats for the paginated list pages.
--
-- Invoices, expenses, and time entries now load one 50-row page at a time, so
-- the header numbers — outstanding balance, monthly spend, unbilled hours —
-- can no longer be summed from the rows a page received. These functions do
-- the aggregation in Postgres under the caller's own RLS, so the numbers are
-- exactly what the old load-everything queries produced; the rows just stop
-- crossing the wire to compute a total.

-- Outstanding balance from the same view the invoices list reads, so payment
-- and status logic stay in one place, filtered the way the header always was
-- (sent or partial, i.e. money actually owed).
create or replace function public.invoice_outstanding()
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(v.balance), 0)::numeric
  from public.invoice_balances v
  where v.status in ('sent', 'partial')
$$;

revoke all on function public.invoice_outstanding() from public, anon;
grant execute on function public.invoice_outstanding() to authenticated;

-- Expense headline numbers: all-time total and entry count, plus the slice
-- for one calendar month. The caller passes the first day of the *local*
-- month (built from the user's timezone on the server) so no UTC conversion
-- can push a late-night expense across the month boundary; the half-open
-- range also keeps the index on (user_id, spent_on desc) usable.
create or replace function public.expense_totals(p_month_start date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total', coalesce(sum(e.amount), 0),
    'entries', count(*),
    'month_total', coalesce(sum(
      case
        when e.spent_on >= p_month_start
         and e.spent_on < (p_month_start + interval '1 month')::date
        then e.amount
        else 0
      end
    ), 0)
  )
  from public.expenses e
$$;

revoke all on function public.expense_totals(date) from public, anon;
grant execute on function public.expense_totals(date) to authenticated;

-- Time headline numbers: finished entries only (a running timer never had a
-- duration), summed for the whole workspace or narrowed to one project the
-- same way the table is. Unbilled = billable rows with no invoice yet, which
-- is the number the "turn time into an invoice" flow is built around.
create or replace function public.time_totals(p_project uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'unbilled_minutes', coalesce(sum(
      case when e.billable and e.invoice_id is null then e.duration_minutes else 0 end
    ), 0),
    'total_minutes', coalesce(sum(e.duration_minutes), 0),
    'entries', count(*)
  )
  from public.time_entries e
  where e.end_time is not null
    and (
      p_project is null
      or exists (
        select 1 from public.tasks t
        where t.id = e.task_id and t.project_id = p_project
      )
    )
$$;

revoke all on function public.time_totals(uuid) from public, anon;
grant execute on function public.time_totals(uuid) to authenticated;
