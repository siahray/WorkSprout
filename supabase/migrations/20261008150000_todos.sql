-- ---------------------------------------------------------------------------
-- To-dos: a dated checklist per user, optionally linked to a project.
-- A day is "won" when every to-do due on it is completed (streaks build on
-- consecutive won days).
-- ---------------------------------------------------------------------------

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  due_date date not null default current_date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todos_title_not_blank check (char_length(trim(title)) > 0),
  constraint todos_title_length check (char_length(title) <= 200)
);

create index todos_user_date_idx on public.todos (user_id, due_date);
create index todos_user_project_idx on public.todos (user_id, project_id);

alter table public.todos enable row level security;

create policy "Users can manage their own todos"
  on public.todos for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists todos_set_updated_at on public.todos;
create trigger todos_set_updated_at
  before update on public.todos
  for each row execute procedure public.set_updated_at();