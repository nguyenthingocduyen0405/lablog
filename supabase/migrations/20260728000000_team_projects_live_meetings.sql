create table if not exists public.team_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  description text not null default '' check (char_length(description) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.team_project_members (
  project_id uuid not null references public.team_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('host', 'member')),
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (project_id, user_id)
);

create index if not exists team_project_members_user_status_idx
on public.team_project_members (user_id, status, created_at desc);

alter table public.team_projects enable row level security;
alter table public.team_project_members enable row level security;

create or replace function public.can_view_team_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_projects as project
    where project.id = target_project_id
      and project.owner_id = (select auth.uid())
  ) or exists (
    select 1 from public.team_project_members as member
    where member.project_id = target_project_id
      and member.user_id = (select auth.uid())
      and member.status = 'accepted'
  );
$$;

drop policy if exists "Project members can view projects" on public.team_projects;
create policy "Project members can view projects"
on public.team_projects for select to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.team_project_members as member
    where member.project_id = team_projects.id
      and member.user_id = (select auth.uid())
  )
);

drop policy if exists "Project members can view memberships" on public.team_project_members;
create policy "Project members can view memberships"
on public.team_project_members for select to authenticated
using (
  user_id = (select auth.uid())
  or public.can_view_team_project(project_id)
);

alter table public.online_meetings
add column if not exists project_id uuid references public.team_projects(id) on delete cascade,
add column if not exists ended_at timestamptz;

alter table public.online_meetings
drop column if exists duration_minutes;

drop policy if exists "Lab members can view online meetings" on public.online_meetings;
drop policy if exists "Members can create online meetings" on public.online_meetings;
drop policy if exists "Creators can update online meetings" on public.online_meetings;
drop policy if exists "Creators can delete online meetings" on public.online_meetings;

create policy "Project members can view live meetings"
on public.online_meetings for select to authenticated
using (
  creator_id = (select auth.uid())
  or exists (
    select 1 from public.team_project_members as member
    where member.project_id = online_meetings.project_id
      and member.user_id = (select auth.uid())
      and member.status = 'accepted'
  )
);

create unique index if not exists online_meetings_one_live_per_project_idx
on public.online_meetings (project_id)
where ended_at is null and project_id is not null;

alter table public.notifications
add column if not exists project_id uuid references public.team_projects(id) on delete cascade,
add column if not exists project_title text;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('reaction', 'comment', 'streak_reminder', 'mission_reminder', 'mission_invite', 'team_project_invite'));

create unique index if not exists notifications_team_project_invite_unique_idx
on public.notifications (recipient_id, project_id)
where type = 'team_project_invite';

create or replace function public.create_team_project(project_name text, project_description text, invited_user_ids uuid[])
returns public.team_projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  created_project public.team_projects;
begin
  if host_id is null then raise exception 'Authentication required'; end if;
  project_name := btrim(project_name);
  if char_length(project_name) not between 1 and 100 then raise exception 'Invalid project name'; end if;

  insert into public.team_projects (owner_id, name, description)
  values (host_id, project_name, left(coalesce(project_description, ''), 500))
  returning * into created_project;

  insert into public.team_project_members (project_id, user_id, invited_by, role, status, responded_at)
  values (created_project.id, host_id, host_id, 'host', 'accepted', now());

  insert into public.team_project_members (project_id, user_id, invited_by, role, status)
  select created_project.id, profile.id, host_id, 'member', 'invited'
  from public.profiles as profile
  where profile.id = any(coalesce(invited_user_ids, array[]::uuid[]))
    and profile.id <> host_id
  on conflict (project_id, user_id) do nothing;

  insert into public.notifications (recipient_id, actor_id, type, project_id, project_title)
  select profile.id, host_id, 'team_project_invite', created_project.id, created_project.name
  from public.profiles as profile
  where profile.id = any(coalesce(invited_user_ids, array[]::uuid[]))
    and profile.id <> host_id
  on conflict (recipient_id, project_id) where type = 'team_project_invite' do nothing;

  return created_project;
end;
$$;

create or replace function public.respond_to_team_project_invite(target_project_id uuid, response_status text)
returns public.team_project_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  updated_member public.team_project_members;
begin
  if member_id is null then raise exception 'Authentication required'; end if;
  if response_status not in ('accepted', 'declined') then raise exception 'Invalid response'; end if;

  update public.team_project_members
  set status = response_status, responded_at = now()
  where project_id = target_project_id and user_id = member_id and status = 'invited'
  returning * into updated_member;
  if not found then raise exception 'Project invitation not found'; end if;

  update public.notifications set read_at = now()
  where recipient_id = member_id and project_id = target_project_id and type = 'team_project_invite';
  return updated_member;
end;
$$;

create or replace function public.start_project_meeting(target_project_id uuid, meeting_title text)
returns public.online_meetings
language plpgsql
security definer
set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  created_meeting public.online_meetings;
begin
  if host_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.team_projects as project
    where project.id = target_project_id and project.owner_id = host_id and project.active
  ) then raise exception 'Only the project host can start a meeting'; end if;

  if exists (
    select 1 from public.online_meetings as meeting
    where meeting.project_id = target_project_id and meeting.ended_at is null
  ) then raise exception 'A meeting is already live'; end if;

  insert into public.online_meetings (creator_id, project_id, title, description, starts_at)
  values (host_id, target_project_id, left(btrim(meeting_title), 100), '', now())
  returning * into created_meeting;
  return created_meeting;
end;
$$;

create or replace function public.end_project_meeting(target_meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare host_id uuid := (select auth.uid());
begin
  update public.online_meetings
  set ended_at = now()
  where id = target_meeting_id and creator_id = host_id and ended_at is null;
  if not found then raise exception 'Only the host can end this meeting'; end if;
end;
$$;

revoke all on function public.create_team_project(text, text, uuid[]) from public;
revoke all on function public.respond_to_team_project_invite(uuid, text) from public;
revoke all on function public.start_project_meeting(uuid, text) from public;
revoke all on function public.end_project_meeting(uuid) from public;
revoke all on function public.can_view_team_project(uuid) from public;
grant execute on function public.create_team_project(text, text, uuid[]) to authenticated;
grant execute on function public.respond_to_team_project_invite(uuid, text) to authenticated;
grant execute on function public.start_project_meeting(uuid, text) to authenticated;
grant execute on function public.end_project_meeting(uuid) to authenticated;
grant execute on function public.can_view_team_project(uuid) to authenticated;
grant select on table public.team_projects to authenticated;
grant select on table public.team_project_members to authenticated;
