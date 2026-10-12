-- Project phases: a project is broken into ordered phases that group its tasks.
-- Deleting a phase keeps its tasks and simply unassigns them (phase_id -> null).
-- ---------------------------------------------------------------------------

create table if not exists public.phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phases_title_not_blank check (char_length(trim(title)) > 0),
  constraint phases_title_length check (char_length(title) <= 200)
);

create index if not exists phases_project_id_idx on public.phases (project_id, position);

alter table public.phases enable row level security;

drop policy if exists "Users can manage phases of their projects" on public.phases;
create policy "Users can manage phases of their projects"
  on public.phases for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = phases.project_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = phases.project_id
        and p.user_id = (select auth.uid())
    )
  );

drop trigger if exists phases_set_updated_at on public.phases;
create trigger phases_set_updated_at
  before update on public.phases
  for each row execute procedure public.set_updated_at();

alter table public.tasks
  add column if not exists phase_id uuid references public.phases(id) on delete set null;

create index if not exists tasks_phase_id_idx on public.tasks (phase_id);
