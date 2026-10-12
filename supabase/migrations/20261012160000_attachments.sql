-- WorkSprout attachments: private file storage for project deliverables/briefs
-- and invoice expense receipts.
--
-- Files live in a single private Storage bucket (`attachments`). Object paths are
-- namespaced by owner id (`<user_id>/<parent_type>/<parent_id>/<uuid>-<name>`), and
-- both the metadata table and the storage policies are scoped to that first folder
-- segment so a user can only ever read or write their own files.
--
-- Applied to the linked project with:
--   supabase db query -f supabase/migrations/20261012160000_attachments.sql --linked
-- (Remote migration history is intentionally empty, so `supabase db push` is not used.)

-- ---------------------------------------------------------------------------
-- 1. Metadata table
-- ---------------------------------------------------------------------------

-- Every row belongs to exactly one parent: a project or an invoice.
create table if not exists public.attachments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  name text not null,
  path text not null,
  mime_type text,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  created_at timestamptz not null default now(),
  constraint attachments_parent_check check (
    (project_id is not null and invoice_id is null)
    or (project_id is null and invoice_id is not null)
  )
);

create unique index if not exists attachments_path_idx on public.attachments (path);
create index if not exists attachments_user_id_idx on public.attachments (user_id);
create index if not exists attachments_project_id_idx on public.attachments (project_id);
create index if not exists attachments_invoice_id_idx on public.attachments (invoice_id);

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.attachments enable row level security;

-- Owner-scoped, plus a check that the referenced parent actually belongs to the
-- caller so a row can never be attached to someone else's project or invoice.
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
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Storage bucket
-- ---------------------------------------------------------------------------

-- Private bucket with server-enforced size and mime-type limits. The allowed
-- types must stay in sync with ALLOWED_MIME_TYPES in lib/attachments.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760, -- 10 MB
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 4. Storage object policies
-- ---------------------------------------------------------------------------

-- storage.foldername(name) splits the object path into its folder segments, so
-- [1] is the owner-id prefix. Read is granted for signed-URL generation too.
drop policy if exists "Users read own attachments" on storage.objects;
create policy "Users read own attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Upsert (replace) needs INSERT + SELECT + UPDATE together.
drop policy if exists "Users upload own attachments" on storage.objects;
create policy "Users upload own attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users update own attachments" on storage.objects;
create policy "Users update own attachments"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users delete own attachments" on storage.objects;
create policy "Users delete own attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
