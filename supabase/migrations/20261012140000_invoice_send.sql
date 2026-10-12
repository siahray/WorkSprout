-- Transactional invoice delivery: a public share link plus send history.
--
-- `public_token` is a capability URL — whoever holds it can read that one
-- invoice through `invoice_public`, with no session. It is a random UUID and
-- is never listed anywhere, only used on links generated when sending.
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261012140000_invoice_send.sql --linked

-- ---------------------------------------------------------------------------
-- 1. Send history and share token
-- ---------------------------------------------------------------------------

alter table public.invoices
  add column if not exists public_token uuid not null default gen_random_uuid(),
  add column if not exists sent_at timestamptz,
  add column if not exists sent_to text;

create unique index if not exists invoices_public_token_idx
  on public.invoices (public_token);

-- ---------------------------------------------------------------------------
-- 2. Expose the new columns on the derived view
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
  i.public_token,
  i.sent_at,
  i.sent_to,
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

-- ---------------------------------------------------------------------------
-- 3. Public read by token
-- ---------------------------------------------------------------------------

-- Returns one invoice with its items, payments, client and the sender's
-- business block, as a single JSON document. SECURITY DEFINER so it works
-- without a session; RLS on the underlying tables is bypassed by the owner.
-- Only the invoice matching the unguessable token is ever returned.
create or replace function public.invoice_public(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', i.id,
      'number', i.number,
      'base_status', i.status::text,
      'issue_date', i.issue_date,
      'due_date', i.due_date,
      'currency', i.currency,
      'taxes', i.taxes,
      'subtotal', i.subtotal,
      'tax_amount', i.tax_amount,
      'total', i.total,
      'notes', i.notes,
      'project_name', (select pr.name from public.projects pr where pr.id = i.project_id),
      'sent_at', i.sent_at
    ),
    'items', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'description', x.description,
            'quantity', x.quantity,
            'unit_rate', x.unit_rate,
            'amount', x.amount
          )
          order by x.created_at
        ),
        '[]'::jsonb
      )
      from public.invoice_items x
      where x.invoice_id = i.id
    ),
    'payments', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'amount', p.amount,
            'paid_at', p.paid_at,
            'method', p.method
          )
          order by p.paid_at
        ),
        '[]'::jsonb
      )
      from public.payments p
      where p.invoice_id = i.id
    ),
    'client', jsonb_build_object(
      'name', c.name,
      'company', c.company,
      'address', c.address,
      'email', c.email,
      'tax_id', c.tax_id
    ),
    'business', jsonb_build_object(
      'business_name', p.business_name,
      'full_name', p.full_name,
      'business_address', p.business_address,
      'business_phone', p.business_phone,
      'email', p.email
    )
  )
  from public.invoices i
  join public.clients c on c.id = i.client_id
  join public.profiles p on p.id = i.user_id
  where i.public_token = p_token;
$$;

revoke all on function public.invoice_public(uuid) from public;
grant execute on function public.invoice_public(uuid) to anon, authenticated;
