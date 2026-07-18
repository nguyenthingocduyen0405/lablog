alter table public.team_projects
add column if not exists deadline date,
add column if not exists reward_points integer not null default 30,
add column if not exists status text not null default 'active',
add column if not exists completed_at timestamptz;

update public.team_projects
set deadline = coalesce(deadline, (created_at at time zone 'Asia/Seoul')::date + 30);

alter table public.team_projects alter column deadline set not null;
alter table public.team_projects drop constraint if exists team_projects_reward_points_check;
alter table public.team_projects add constraint team_projects_reward_points_check check (reward_points between 1 and 500);
alter table public.team_projects drop constraint if exists team_projects_status_check;
alter table public.team_projects add constraint team_projects_status_check check (status in ('active', 'completed'));

create table if not exists public.team_project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.team_projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  due_on date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists team_project_tasks_project_due_idx
on public.team_project_tasks (project_id, completed, due_on);

create table if not exists public.team_project_point_awards (
  project_id uuid not null references public.team_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points between 1 and 500),
  awarded_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

alter table public.team_project_tasks enable row level security;
alter table public.team_project_point_awards enable row level security;

drop policy if exists "Project members can view tasks" on public.team_project_tasks;
create policy "Project members can view tasks" on public.team_project_tasks for select to authenticated
using (public.can_view_team_project(project_id));

drop policy if exists "Members can view project point awards" on public.team_project_point_awards;
create policy "Members can view project point awards" on public.team_project_point_awards for select to authenticated
using (user_id = (select auth.uid()) or public.can_view_team_project(project_id));

create or replace function public.create_team_project(
  project_name text, project_description text, project_deadline date,
  project_reward_points integer, invited_user_ids uuid[]
)
returns public.team_projects
language plpgsql security definer set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  created_project public.team_projects;
begin
  if host_id is null then raise exception 'Authentication required'; end if;
  project_name := btrim(project_name);
  if char_length(project_name) not between 1 and 100 then raise exception 'Invalid project name'; end if;
  if project_deadline < (now() at time zone 'Asia/Seoul')::date then raise exception 'Deadline cannot be in the past'; end if;
  if project_reward_points not between 1 and 500 then raise exception 'Reward points must be between 1 and 500'; end if;

  insert into public.team_projects (owner_id, name, description, deadline, reward_points)
  values (host_id, project_name, left(coalesce(project_description, ''), 500), project_deadline, project_reward_points)
  returning * into created_project;

  insert into public.team_project_members (project_id, user_id, invited_by, role, status, responded_at)
  values (created_project.id, host_id, host_id, 'host', 'accepted', now());

  insert into public.team_project_members (project_id, user_id, invited_by, role, status)
  select created_project.id, profile.id, host_id, 'member', 'invited'
  from public.profiles as profile
  where profile.id = any(coalesce(invited_user_ids, array[]::uuid[])) and profile.id <> host_id
  on conflict (project_id, user_id) do nothing;

  insert into public.notifications (recipient_id, actor_id, type, project_id, project_title)
  select profile.id, host_id, 'team_project_invite', created_project.id, created_project.name
  from public.profiles as profile
  where profile.id = any(coalesce(invited_user_ids, array[]::uuid[])) and profile.id <> host_id
  on conflict (recipient_id, project_id) where type = 'team_project_invite' do nothing;

  return created_project;
end;
$$;

create or replace function public.create_team_project_task(
  target_project_id uuid, task_title text, task_description text,
  task_assignee_id uuid, task_due_on date
)
returns public.team_project_tasks
language plpgsql security definer set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  project_deadline date;
  created_task public.team_project_tasks;
begin
  select project.deadline into project_deadline
  from public.team_projects as project
  where project.id = target_project_id and project.owner_id = host_id and project.status = 'active';
  if not found then raise exception 'Only the host can create tasks'; end if;
  if not exists (
    select 1 from public.team_project_members as member
    where member.project_id = target_project_id and member.user_id = task_assignee_id and member.status = 'accepted'
  ) then raise exception 'Assignee must be an accepted project member'; end if;
  if task_due_on < (now() at time zone 'Asia/Seoul')::date then raise exception 'Task deadline cannot be in the past'; end if;
  if task_due_on > project_deadline then raise exception 'Task deadline cannot be after project deadline'; end if;

  insert into public.team_project_tasks (project_id, title, description, assignee_id, due_on, created_by)
  values (target_project_id, btrim(task_title), left(coalesce(task_description, ''), 500), task_assignee_id, task_due_on, host_id)
  returning * into created_task;
  return created_task;
end;
$$;

create or replace function public.set_team_project_task_completed(target_task_id uuid, is_completed boolean)
returns public.team_project_tasks
language plpgsql security definer set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  updated_task public.team_project_tasks;
begin
  update public.team_project_tasks as task
  set completed = is_completed, completed_at = case when is_completed then now() else null end
  from public.team_projects as project
  where task.id = target_task_id and project.id = task.project_id and project.status = 'active'
    and (task.assignee_id = member_id or project.owner_id = member_id)
  returning task.* into updated_task;
  if not found then raise exception 'Only the assignee or host can update this task'; end if;
  return updated_task;
end;
$$;

create or replace function public.delete_team_project_task(target_task_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare host_id uuid := (select auth.uid());
begin
  delete from public.team_project_tasks as task
  using public.team_projects as project
  where task.id = target_task_id and project.id = task.project_id
    and project.owner_id = host_id and project.status = 'active';
  if not found then raise exception 'Only the host can delete this task'; end if;
end;
$$;

create or replace function public.complete_team_project(target_project_id uuid)
returns public.team_projects
language plpgsql security definer set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  completed_project public.team_projects;
begin
  select * into completed_project from public.team_projects as project
  where project.id = target_project_id and project.owner_id = host_id and project.status = 'active'
  for update;
  if not found then raise exception 'Only the host can complete this project'; end if;
  if not exists (select 1 from public.team_project_tasks where project_id = target_project_id) then
    raise exception 'Create at least one task before completing the project';
  end if;
  if exists (select 1 from public.team_project_tasks where project_id = target_project_id and not completed) then
    raise exception 'All tasks must be completed first';
  end if;

  update public.team_projects set status = 'completed', active = false, completed_at = now()
  where id = target_project_id returning * into completed_project;

  insert into public.team_project_point_awards (project_id, user_id, points)
  select target_project_id, member.user_id, completed_project.reward_points
  from public.team_project_members as member
  where member.project_id = target_project_id and member.status = 'accepted'
  on conflict (project_id, user_id) do nothing;

  return completed_project;
end;
$$;

create or replace function public.get_team_project_reward_total(target_user_id uuid)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(award.points), 0)::integer
  from public.team_project_point_awards as award
  where award.user_id = target_user_id
    and (select auth.uid()) is not null;
$$;

revoke all on function public.create_team_project(text, text, date, integer, uuid[]) from public;
revoke all on function public.create_team_project_task(uuid, text, text, uuid, date) from public;
revoke all on function public.set_team_project_task_completed(uuid, boolean) from public;
revoke all on function public.delete_team_project_task(uuid) from public;
revoke all on function public.complete_team_project(uuid) from public;
revoke all on function public.get_team_project_reward_total(uuid) from public;
grant execute on function public.create_team_project(text, text, date, integer, uuid[]) to authenticated;
grant execute on function public.create_team_project_task(uuid, text, text, uuid, date) to authenticated;
grant execute on function public.set_team_project_task_completed(uuid, boolean) to authenticated;
grant execute on function public.delete_team_project_task(uuid) to authenticated;
grant execute on function public.complete_team_project(uuid) to authenticated;
grant execute on function public.get_team_project_reward_total(uuid) to authenticated;
grant select on table public.team_project_tasks to authenticated;
grant select on table public.team_project_point_awards to authenticated;
