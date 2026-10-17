-- 1. Profiles (Extends Supabase Auth Users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  business_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Trigger to automatically create a profile when a new auth user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;


-- 2. Clients
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  email text,
  company text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.clients enable row level security;
create policy "Users can manage their own clients" on clients for all using (auth.uid() = user_id);


-- 3. Projects
create type project_status as enum ('active', 'completed', 'on_hold', 'archived');

create table public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  name text not null,
  status project_status default 'active'::project_status,
  hourly_rate numeric(10, 2), 
  fixed_rate numeric(10, 2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;
create policy "Users can manage their own projects" on projects for all using (auth.uid() = user_id);


-- 4. Tasks
create type task_status as enum ('todo', 'in_progress', 'done');

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  status task_status default 'todo'::task_status,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;
create policy "Users can manage tasks of their projects" on tasks for all 
using (
  exists (
    select 1 from public.projects where projects.id = tasks.project_id and projects.user_id = auth.uid()
  )
);


-- 5. Time Entries
create table public.time_entries (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration_minutes integer, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.time_entries enable row level security;
create policy "Users can manage time entries of their tasks" on time_entries for all 
using (
  exists (
    select 1 from public.tasks 
    join public.projects on tasks.project_id = projects.id 
    where tasks.id = time_entries.task_id and projects.user_id = auth.uid()
  )
);