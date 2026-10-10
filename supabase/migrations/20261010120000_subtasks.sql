-- Add subtasks: tasks can have parent tasks
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  parent_task_id uuid references public.tasks(id) on delete cascade not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status task_status default 'todo'::task_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subtasks_title_not_blank check (char_length(trim(title)) > 0),
  constraint subtasks_title_length check (char_length(title) <= 200)
);

create index if not exists subtasks_parent_idx on public.subtasks (parent_task_id);
create index if not exists subtasks_project_idx on public.subtasks (project_id);

alter table public.subtasks enable row level security;

create policy "Users can manage subtasks of their projects"
  on public.subtasks for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = subtasks.project_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = subtasks.project_id
        and p.user_id = (select auth.uid())
    )
  );

drop trigger if exists subtasks_set_updated_at on public.subtasks;
create trigger subtasks_set_updated_at
  before update on public.subtasks
  for each row execute procedure public.set_updated_at();
