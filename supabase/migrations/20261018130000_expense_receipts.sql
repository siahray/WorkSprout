-- Expense receipts: `attachments` gains expenses as a third parent, so a logged
-- expense can carry the proof a deduction needs.
--
-- Storage needs no change: object paths are already namespaced by owner folder
-- (`<user_id>/<parent_type>/<parent_id>/…`) and the storage policies only
-- inspect that first segment, so `expense` fits as a path segment as-is.

-- ---------------------------------------------------------------------------
-- 1. Metadata: new parent column
-- ---------------------------------------------------------------------------

alter table public.attachments
  add column if not exists expense_id uuid references public.expenses(id) on delete cascade;

-- Every row belongs to exactly one parent: a project, an invoice, or an expense.
alter table public.attachments drop constraint if exists attachments_parent_check;
alter table public.attachments add constraint attachments_parent_check check (
  (project_id is not null and invoice_id is null and expense_id is null)
  or (project_id is null and invoice_id is not null and expense_id is null)
  or (project_id is null and invoice_id is null and expense_id is not null)
);

create index if not exists attachments_expense_id_idx on public.attachments (expense_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security: the with check gains the expense branch
-- ---------------------------------------------------------------------------

-- Same shape as before — owner-scoped, plus proof that the referenced parent
-- belongs to the caller so a row can never ride on someone else's expense.
drop policy if exists "Users can manage their own attachments" on public.attachments;
create policy "Users can manage their own attachments"
  on public.attachments for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      (
        project_id is not null
        and exists (
          select 1 from public.projects p
          where p.id = project_id and p.user_id = (select auth.uid())
        )
      )
      or (
        invoice_id is not null
        and exists (
          select 1 from public.invoices i
          where i.id = invoice_id and i.user_id = (select auth.uid())
        )
      )
      or (
        expense_id is not null
        and exists (
          select 1 from public.expenses e
          where e.id = expense_id and e.user_id = (select auth.uid())
        )
      )
    )
  );
