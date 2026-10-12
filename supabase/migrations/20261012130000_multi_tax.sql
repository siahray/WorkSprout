-- Multiple taxes per profile, snapshotted onto invoices.
--
-- Replaces the single (tax_label, tax_rate) pair with a JSON array of
-- { label, rate } so a user can charge several at once (VAT, service fee, …).
-- The legacy columns are kept for history and backfilled into the new ones.
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261012130000_multi_tax.sql --linked

-- ---------------------------------------------------------------------------
-- 1. New columns
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists taxes jsonb not null default '[]'::jsonb;

alter table public.invoices
  add column if not exists taxes jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Backfill from the legacy single tax columns
-- ---------------------------------------------------------------------------

update public.profiles
set taxes = jsonb_build_array(jsonb_build_object('label', tax_label, 'rate', tax_rate))
where taxes = '[]'::jsonb and tax_rate > 0;

update public.invoices
set taxes = jsonb_build_array(jsonb_build_object('label', tax_label, 'rate', tax_rate))
where taxes = '[]'::jsonb and tax_rate > 0;

-- ---------------------------------------------------------------------------
-- 3. Expose the snapshot on the derived invoice view
-- ---------------------------------------------------------------------------

drop view if exists public.invoice_balances;
create view public.invoice_balances
with (security_invoker = true) as
select
  i.id,
  i.user_id,
  i.client_id,
  i.project_id,
  i.number,
  i.issue_date,
  i.due_date,
  i.currency,
  i.tax_rate,
  i.tax_label,
  i.taxes,
  i.subtotal,
  i.tax_amount,
  i.total,
  i.notes,
  i.created_at,
  i.updated_at,
  i.status as base_status,
  (select c.name from public.clients c where c.id = i.client_id) as client_name,
  (select pr.name from public.projects pr where pr.id = i.project_id) as project_name,
  coalesce(sum(p.amount), 0)::numeric(12, 2) as amount_paid,
  (i.total - coalesce(sum(p.amount), 0))::numeric(12, 2) as balance,
  case
    when i.status = 'void' then 'void'
    when i.status = 'draft' then 'draft'
    when coalesce(sum(p.amount), 0) >= i.total then 'paid'
    when coalesce(sum(p.amount), 0) > 0 then 'partial'
    else 'sent'
  end as status
from public.invoices i
left join public.payments p on p.invoice_id = i.id
group by i.id;
