-- Reordering: phases already had `position`, but tasks and subtasks had none and
-- were listed purely by created_at. This gives them a `position`, seeds it from
-- the existing created_at order so nothing visibly moves, and indexes it for the
-- ordered reads.
--
-- Ordering is scoped to a group, matching how the UI lists them:
--   * a task is ordered within its (project, phase) pair — each phase orders its
--     own tasks, and a null phase is the project's "unassigned" bucket;
--   * a subtask is ordered within its parent task.

alter table public.tasks add column if not exists position integer not null default 0;
alter table public.subtasks add column if not exists position integer not null default 0;

-- Seed from the current visible order (created_at, then id as a stable tiebreak)
-- so this migration never reorders anything a user can already see. Window
-- partitioning treats a null phase_id as its own group, which is what we want.
with ranked as (
  select
    id,
    row_number() over (
      partition by project_id, phase_id
      order by created_at, id
    ) - 1 as new_position
  from public.tasks
)
update public.tasks t
set position = ranked.new_position
from ranked
where t.id = ranked.id
  and t.position is distinct from ranked.new_position;

with ranked as (
  select
    id,
    row_number() over (
      partition by parent_task_id
      order by created_at, id
    ) - 1 as new_position
  from public.subtasks
)
update public.subtasks s
set position = ranked.new_position
from ranked
where s.id = ranked.id
  and s.position is distinct from ranked.new_position;

create index if not exists tasks_phase_position_idx
  on public.tasks (project_id, phase_id, position);

create index if not exists subtasks_parent_position_idx
  on public.subtasks (parent_task_id, position);
