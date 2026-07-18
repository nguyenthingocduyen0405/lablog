create table if not exists public.mission_participants (
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  primary key (mission_id, user_id),
  check (user_id <> invited_by)
);

create index if not exists mission_participants_user_status_idx
on public.mission_participants (user_id, status, created_at desc);

alter table public.mission_participants enable row level security;

drop policy if exists "Mission members can view participation" on public.mission_participants;
create policy "Mission members can view participation"
on public.mission_participants for select to authenticated
using ((select auth.uid()) = user_id or (select auth.uid()) = invited_by);

drop policy if exists "Members can view their missions" on public.missions;
drop policy if exists "Mission members can view missions" on public.missions;
create policy "Mission members can view missions"
on public.missions for select to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1 from public.mission_participants as participant
    where participant.mission_id = missions.id
      and participant.user_id = (select auth.uid())
  )
);

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('reaction', 'comment', 'streak_reminder', 'mission_reminder', 'mission_invite'));

create unique index if not exists notifications_mission_invite_unique_idx
on public.notifications (recipient_id, mission_id)
where type = 'mission_invite';

create or replace function public.invite_members_to_mission(target_mission_id uuid, invited_user_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := (select auth.uid());
  mission_title_value text;
  invited_count integer := 0;
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  select mission.title into mission_title_value
  from public.missions as mission
  where mission.id = target_mission_id
    and mission.user_id = owner_id
    and mission.active
    and (now() at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on;

  if not found then
    raise exception 'Only the mission owner can invite members';
  end if;

  insert into public.mission_participants (mission_id, user_id, invited_by, status, responded_at)
  select target_mission_id, profile.id, owner_id, 'invited', null
  from public.profiles as profile
  where profile.id = any(invited_user_ids)
    and profile.id <> owner_id
  on conflict (mission_id, user_id)
  do update set invited_by = excluded.invited_by, status = 'invited', responded_at = null;
  get diagnostics invited_count = row_count;

  insert into public.notifications (recipient_id, actor_id, type, mission_id, mission_title)
  select profile.id, owner_id, 'mission_invite', target_mission_id, mission_title_value
  from public.profiles as profile
  where profile.id = any(invited_user_ids)
    and profile.id <> owner_id
  on conflict (recipient_id, mission_id) where type = 'mission_invite'
  do update set actor_id = excluded.actor_id, mission_title = excluded.mission_title, read_at = null, created_at = now();

  return invited_count;
end;
$$;

create or replace function public.respond_to_mission_invite(target_mission_id uuid, response_status text)
returns public.mission_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  updated_participant public.mission_participants;
begin
  if member_id is null then
    raise exception 'Authentication required';
  end if;
  if response_status not in ('accepted', 'declined') then
    raise exception 'Invalid invitation response';
  end if;

  update public.mission_participants
  set status = response_status, responded_at = now()
  where mission_id = target_mission_id
    and user_id = member_id
    and status = 'invited'
  returning * into updated_participant;

  if not found then
    raise exception 'Mission invitation not found';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_id = member_id
    and mission_id = target_mission_id
    and type = 'mission_invite';

  return updated_participant;
end;
$$;

create or replace function public.attach_active_mission_to_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_mission public.missions;
begin
  if new.mission_id is not null then
    select * into chosen_mission
    from public.missions as mission
    where mission.id = new.mission_id
      and mission.active
      and (new.created_at at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on
      and (
        mission.user_id = new.user_id
        or exists (
          select 1 from public.mission_participants as participant
          where participant.mission_id = mission.id
            and participant.user_id = new.user_id
            and participant.status = 'accepted'
        )
      );

    if not found then
      raise exception 'Choose one of your active missions';
    end if;

    new.mission_title := chosen_mission.title;
    if exists (
      select 1 from public.posts as post
      where post.user_id = new.user_id
        and post.mission_id = chosen_mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = (new.created_at at time zone 'Asia/Seoul')::date
    ) then
      new.score_awarded := 0;
    else
      new.score_awarded := chosen_mission.points_per_update;
    end if;
  else
    new.mission_title := null;
    if exists (
      select 1 from public.posts as post
      where post.user_id = new.user_id
        and (post.created_at at time zone 'Asia/Seoul')::date = (new.created_at at time zone 'Asia/Seoul')::date
    ) then
      new.score_awarded := 0;
    else
      new.score_awarded := 1;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.invite_members_to_mission(uuid, uuid[]) from public;
revoke all on function public.respond_to_mission_invite(uuid, text) from public;
grant execute on function public.invite_members_to_mission(uuid, uuid[]) to authenticated;
grant execute on function public.respond_to_mission_invite(uuid, text) to authenticated;
