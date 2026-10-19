-- Archive clients: the alternative to the destructive cascade delete.
--
-- `archived_at` is visibility only. NULL means active; a timestamp means the
-- client has been pulled out of every list and picker, but their projects,
-- invoices, time, and attachments are untouched — restore clears the column
-- and everything reappears. No backfill (existing rows start active), no RLS
-- change (the owner policy on clients already covers the update), and no
-- index (per-user client lists are tiny and always scanned under user_id).

alter table public.clients
  add column if not exists archived_at timestamptz;
